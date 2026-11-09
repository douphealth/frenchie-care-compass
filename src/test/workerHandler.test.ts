import { readFileSync } from "node:fs";
import { describe, expect, it, afterEach } from "vitest";
import { handleRequest, type Asset } from "../../worker/handle";
import { vaultAccess, type StripeSession } from "../../worker/payments";
import { PREMIUM_PRICE_ID, EMERGENCY_CARD_PRICE_ID } from "@/lib/stripeConfig";
import { verifyStripeSignature } from "@/lib/stripeSignature";

const html = btoa("<!doctype html><html><head><title>Frenchie</title></head><body>ok</body></html>");
const script = btoa("console.log('app')");
const assets: Record<string, Asset> = {
  "/index.html": { contentType: "text/html; charset=utf-8", base64: html },
  "/assets/app-abc123.js": { contentType: "text/javascript; charset=utf-8", base64: script },
  "/og-image.png": { contentType: "image/png", base64: btoa("png") },
};

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function paidSession(priceIds: string[], extra: Partial<StripeSession> = {}): StripeSession {
  return {
    id: "cs_test_paid",
    status: "complete",
    payment_status: "paid",
    url: "https://checkout.stripe.com/c/pay/cs_test_paid",
    customer_email: "owner@example.com",
    line_items: { data: priceIds.map((id) => ({ price: { id } })) },
    ...extra,
  };
}

describe("client host", () => {
  it("calls the care-plan Worker instead of the deleted Supabase project", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
    const backend = readFileSync("src/lib/revenueBackend.ts", "utf8");
    expect(client).toContain('const SUPABASE_URL = "https://care-plan.frenchyfab.com"');
    expect(client).not.toContain("zyxsijqazzhuudhmfitw.supabase.co");
    expect(backend).toContain("https://care-plan.frenchyfab.com/api/ffab-care/v1");
  });
});

describe("vault access", () => {
  it("locks missing, unpaid, refunded, and wrong-product sessions", () => {
    expect(vaultAccess(paidSession([PREMIUM_PRICE_ID], { payment_status: "unpaid", status: "open" })).paid).toBe(false);
    expect(vaultAccess(paidSession(["price_other_product"])).paid).toBe(false);
    expect(vaultAccess(paidSession([PREMIUM_PRICE_ID], {
      payment_intent: { latest_charge: { refunded: true, amount: 799, amount_refunded: 799 } },
    })).paid).toBe(false);
    const ok = vaultAccess(paidSession([PREMIUM_PRICE_ID, EMERGENCY_CARD_PRICE_ID]));
    expect(ok.paid).toBe(true);
    expect(ok.includeEmergencyCard).toBe(true);
  });
});

describe("worker routing", () => {
  it("serves HTML with security headers and immutable hashed assets", async () => {
    const page = await handleRequest(new Request("https://care-plan.frenchyfab.com/"), {}, assets);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(page.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(page.headers.get("x-content-type-options")).toBe("nosniff");
    expect(page.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(page.headers.get("x-robots-tag")).toBe("index, follow");
    expect(page.headers.get("cache-control")).toContain("max-age=300");
    expect(await page.text()).toContain("<title>Frenchie");

    const hashed = await handleRequest(new Request("https://care-plan.frenchyfab.com/assets/app-abc123.js"), {}, assets);
    expect(hashed.headers.get("cache-control")).toContain("immutable");
    expect(await hashed.text()).toContain("console.log");

    const spa = await handleRequest(new Request("https://care-plan.frenchyfab.com/payment-success"), {}, assets);
    expect(await spa.text()).toContain("<title>Frenchie");
    const missing = await handleRequest(new Request("https://care-plan.frenchyfab.com/assets/missing.js"), {}, assets);
    expect(missing.status).toBe(404);
  });

  it("keeps the plan shim and rejects bad leads", async () => {
    const plan = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/generate-plan", {
      method: "POST",
      body: "{}",
    }), {}, assets);
    expect(await plan.json()).toEqual({ sections: null, fallback: true });

    const welcome = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/send-welcome-email", {
      method: "POST",
      body: "{}",
    }), {}, assets);
    expect(await welcome.json()).toMatchObject({ ok: true });

    const empty = await handleRequest(new Request("https://care-plan.frenchyfab.com/api/ffab-care/v1/lead", {
      method: "POST",
      body: "{}",
    }), {}, assets);
    expect(empty.status).toBe(400);
    const bad = await handleRequest(new Request("https://care-plan.frenchyfab.com/api/ffab-care/v1/lead", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
    }), {}, assets);
    expect(bad.status).toBe(400);
  });

  it("fails closed without Stripe secrets and locks a fake session", async () => {
    const missing = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/verify-payment", {
      method: "POST",
      body: JSON.stringify({ sessionId: "cs_fake_audit" }),
    }), {}, assets);
    expect(missing.status).toBe(503);

    const webhook = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/stripe-webhook", {
      method: "POST",
      body: "{}",
    }), {}, assets);
    expect(webhook.status).toBe(503);

    const restore = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/restore-purchase", {
      method: "POST",
      body: JSON.stringify({ email: "owner@example.com" }),
    }), { STRIPE_SECRET_KEY: "sk_test" }, assets);
    expect(restore.status).toBe(503);
  });

  it("does not unlock an unpaid or wrong-product session", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const id = url.includes("cs_unpaid") ? "cs_unpaid" : "cs_wrong";
      const session = id === "cs_unpaid"
        ? paidSession([PREMIUM_PRICE_ID], { id, payment_status: "unpaid", status: "open" })
        : paidSession(["price_other_product"], { id: "cs_wrong" });
      return new Response(JSON.stringify(session), { status: 200 });
    }) as typeof fetch;

    const env = { STRIPE_SECRET_KEY: "sk_test_123" };
    const unpaid = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/verify-payment", {
      method: "POST",
      body: JSON.stringify({ sessionId: "cs_unpaid" }),
    }), env, assets);
    expect((await unpaid.json()).paid).toBe(false);

    const wrong = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/verify-payment", {
      method: "POST",
      body: JSON.stringify({ sessionId: "cs_wrong" }),
    }), env, assets);
    expect((await wrong.json()).paid).toBe(false);
  });

  it("rejects an unsigned webhook and accepts a signed one for the vault price", async () => {
    const secret = "whsec_test_secret";
    const env = { STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: secret };
    const unsigned = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/stripe-webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    }), env, assets);
    expect(unsigned.status).toBe(400);

    const payload = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_paid" } },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
    const hex = Array.from(new Uint8Array(mac)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(await verifyStripeSignature(payload, `t=${timestamp},v1=${hex}`, secret, timestamp * 1000)).toBe(true);

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("api.stripe.com") && (!init || init.method === undefined || init.method === "GET")) {
        return new Response(JSON.stringify(paidSession([PREMIUM_PRICE_ID])), { status: 200 });
      }
      if (url.includes("api.stripe.com")) return new Response("{}", { status: 200 });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const signed = await handleRequest(new Request("https://care-plan.frenchyfab.com/functions/v1/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": `t=${timestamp},v1=${hex}` },
      body: payload,
    }), env, assets);
    expect(signed.status).toBe(200);
    expect(await signed.json()).toMatchObject({ received: true, fulfilled: true });
  });
});
