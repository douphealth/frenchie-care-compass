import { APP_ORIGIN } from "../src/lib/stripeConfig";
import { isValidEmail, normalizeEmail } from "../src/lib/quizValidation";
import {
  CareEnv,
  createPayment,
  json,
  restorePurchase,
  securityHeaders,
  stripeWebhook,
  verifyPayment,
} from "./payments";

export type Asset = { contentType: string; base64: string };

const LEAD_STORE = "https://app-lead-capture.papalexios.workers.dev/app/frenchyfab";
const WP_ENDPOINT = "https://frenchyfab.com/wp-json/ffab-care/v1";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://frenchyfab.com https://api.stripe.com",
  "form-action 'self' https://buy.stripe.com https://checkout.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

function cors(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "access-control-allow-origin": APP_ORIGIN,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization, apikey, x-client-info, x-requested-with",
    "access-control-max-age": "86400",
    ...extra,
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(cors()).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function cacheControl(pathname: string, contentType: string): string {
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (contentType.includes("text/html")) return "public, max-age=300, must-revalidate";
  return "public, max-age=86400";
}

function assetResponse(request: Request, asset: Asset, pathname: string): Response {
  const headers = securityHeaders({
    "content-type": asset.contentType,
    "cache-control": cacheControl(pathname, asset.contentType),
    "x-hermes-careplan-selfhosted": "worker-main-20261109",
  });
  if (asset.contentType.includes("text/html")) {
    headers.set("content-security-policy", CSP);
    headers.set("x-robots-tag", "index, follow");
  }
  const body = request.method === "HEAD" ? null : decodeBase64(asset.base64);
  return new Response(body, { status: 200, headers });
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

export async function captureLead(request: Request, env: CareEnv): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload: Record<string, unknown> | null = null;
  try {
    const parsed = await readJson(request);
    payload = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const email = typeof payload?.email === "string" ? normalizeEmail(payload.email) : "";
  if (!payload || !isValidEmail(email)) return json({ error: "A valid email is required" }, 400);

  const stored = fetch(`${LEAD_STORE}/rest/v1/email_subscribers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      name: typeof payload.name === "string" ? payload.name : "",
      source: typeof payload.source === "string" ? payload.source : "frenchie-care-compass",
      quiz: payload.answers || payload.plan || null,
    }),
  }).catch((error) => {
    console.error(JSON.stringify({ event: "lead_store_failed", error: String(error) }));
  });

  let brevoOk = false;
  if (env.BREVO_API_KEY) {
    try {
      const name = typeof payload.name === "string" ? payload.name : "";
      const brevo = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: { "content-type": "application/json", "api-key": env.BREVO_API_KEY },
        body: JSON.stringify({
          email,
          attributes: {
            FIRSTNAME: name.split(" ")[0] || "Frenchie",
            FULLNAME: name,
            SOURCE: "frenchie-care-app",
            LAST_CARE_OPTIN_AT: new Date().toISOString(),
          },
          listIds: [Number(env.BREVO_LIST_ID || 8)],
          updateEnabled: true,
        }),
      });
      brevoOk = brevo.ok || brevo.status === 204;
    } catch (error) {
      console.error(JSON.stringify({ event: "brevo_failed", error: String(error) }));
    }
  }
  await stored;
  return new Response(JSON.stringify({ success: true, id: `cf_${Date.now().toString(36)}`, brevo: brevoOk }), {
    status: 200,
    headers: securityHeaders({ ...cors(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-hermes-ff-lead": "capture-20261109" }),
  });
}

async function shimFunction(request: Request, url: URL): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
  const name = url.pathname.split("/").pop() || "";
  if (name === "send-welcome-email") return withCors(json({ ok: true, message: "queued" }));
  return withCors(json({ sections: null, fallback: true }));
}

async function shimRest(request: Request, url: URL): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
  if (request.method === "POST" || request.method === "PATCH" || request.method === "PUT") {
    let payload: unknown = {};
    try { payload = await readJson(request); } catch { payload = {}; }
    fetch(LEAD_STORE + url.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    }).catch(() => undefined);
  }
  return withCors(json([]));
}

async function proxyWordPress(request: Request, url: URL): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
  const suffix = url.pathname.replace("/api/ffab-care/v1", "");
  const headers = new Headers(request.headers);
  headers.delete("origin");
  headers.delete("referer");
  headers.set("host", "frenchyfab.com");
  const response = await fetch(WP_ENDPOINT + suffix + url.search, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow",
  });
  const out = new Headers(response.headers);
  Object.entries(cors({ "content-type": out.get("content-type") || "application/json" })).forEach(([key, value]) => out.set(key, value));
  securityHeaders().forEach((value, key) => out.set(key, value));
  out.set("x-hermes-careplan-api-proxy", "wp-json-ffab-care");
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers: out });
}

export async function handleRequest(request: Request, env: CareEnv, assets: Record<string, Asset>): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname !== "care-plan.frenchyfab.com" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return json({ error: "Not found" }, 404);
  }

  if (url.pathname === "/api/ffab-care/v1/lead" || url.pathname === "/api/ffab-care/v1/email") {
    return captureLead(request, env);
  }

  if (url.pathname === "/functions/v1/verify-payment") {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    return withCors(await verifyPayment(env, await readJson(request).catch(() => null)));
  }
  if (url.pathname === "/functions/v1/create-payment") {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    return withCors(await createPayment(env, await readJson(request).catch(() => null)));
  }
  if (url.pathname === "/functions/v1/restore-purchase") {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(cors()) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    return withCors(await restorePurchase(env, await readJson(request).catch(() => null)));
  }
  if (url.pathname === "/functions/v1/stripe-webhook") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    return stripeWebhook(env, request);
  }
  if (url.pathname.startsWith("/functions/v1/")) return shimFunction(request, url);
  if (url.pathname.startsWith("/rest/v1/")) return shimRest(request, url);
  if (url.pathname.startsWith("/auth/v1/")) return withCors(json({ error: "No auth provider" }, 404));
  if (url.pathname.startsWith("/api/ffab-care/v1")) return proxyWordPress(request, url);

  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed" }, 405);

  const asset = assets[url.pathname] || (url.pathname.endsWith("/") ? assets[url.pathname + "index.html"] : undefined);
  if (asset) return assetResponse(request, asset, url.pathname);
  if (url.pathname.startsWith("/assets/") || url.pathname.includes(".")) return json({ error: "Not found" }, 404);
  const index = assets["/index.html"];
  if (!index) return json({ error: "App shell missing" }, 500);
  return assetResponse(request, index, "/index.html");
}
