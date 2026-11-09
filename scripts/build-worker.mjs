import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outDir = join(root, "dist-worker");
const outFile = join(outDir, "careplan-worker.js");
const genFile = join(root, "worker", "assets.gen.js");
const stub = readFileSync(genFile, "utf8");
const MAX_GZIP = 3 * 1024 * 1024;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (!name.endsWith(".map")) files.push(path);
  }
  return files;
}

function shrinkLargePngs() {
  const script = `
from PIL import Image
import os, sys
root = sys.argv[1]
for dirpath, _, names in os.walk(root):
    for name in names:
        if not name.lower().endswith(".png"):
            continue
        path = os.path.join(dirpath, name)
        if os.path.getsize(path) < 120_000:
            continue
        im = Image.open(path)
        im.thumbnail((512, 512))
        im.save(path, optimize=True)
        print(path, os.path.getsize(path))
`;
  const result = spawnSync("python3", ["-c", script, dist], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error("PNG shrink failed");
  }
  if (result.stdout.trim()) console.log(result.stdout.trim());
}

const vite = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (vite.status !== 0) process.exit(vite.status ?? 1);
shrinkLargePngs();

const assets = {};
for (const file of walk(dist)) {
  const ext = extname(file);
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) throw new Error(`No content type for ${file}`);
  const webPath = "/" + relative(dist, file).split("\\").join("/");
  assets[webPath] = { contentType, base64: readFileSync(file).toString("base64") };
}
if (!assets["/index.html"] || !assets["/og-image.png"]) {
  throw new Error("Build is missing index.html or og-image.png");
}

writeFileSync(genFile, `export const ASSETS = ${JSON.stringify(assets)};\n`);
mkdirSync(outDir, { recursive: true });
try {
  await build({
    entryPoints: [join(root, "worker", "index.ts")],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outfile: outFile,
    legalComments: "none",
    minify: true,
  });
} finally {
  writeFileSync(genFile, stub);
}

const bundled = readFileSync(outFile);
const gzipBytes = gzipSync(bundled).length;
console.log(`worker ${bundled.length} bytes, gzip ${gzipBytes} bytes, assets ${Object.keys(assets).length}`);
if (gzipBytes > MAX_GZIP) {
  throw new Error(`Worker gzip ${gzipBytes} exceeds ${MAX_GZIP}`);
}
if (bundled.includes("sk_live") || bundled.includes("BREVO_API_KEY_VALUE")) {
  throw new Error("Bundle looks like it contains a secret");
}

const artifactDir = "/opt/cursor/artifacts";
mkdirSync(artifactDir, { recursive: true });
copyFileSync(outFile, join(artifactDir, "careplan-worker.js"));
const notes = `# care-plan Worker deploy

Upload this as a single ES module. Do not deploy \`worker/assets.gen.js\`; that file in git is a stub. The bundle is \`careplan-worker.js\` (${gzipBytes} bytes gzipped).

- Worker name: \`frenchyfab-careplan-selfhosted-proxy\`
- main_module: \`careplan-worker.js\`
- compatibility_date: \`2026-09-01\` (same as the Worker that is live today)
- Account: \`5dc0401c38d9de0c6947fee40a210937\`
- Routes to leave in place: \`care-plan.frenchyfab.com\`, \`care-plan.frenchyfab.com/\`, \`care-plan.frenchyfab.com/*\`

## Bindings

| Name | Type | Required |
|---|---|---|
| \`BREVO_LIST_ID\` | plain text \`8\` | yes |
| \`BREVO_API_KEY\` | secret | yes for Brevo sync |
| \`STRIPE_SECRET_KEY\` | secret | yes before a paid unlock can succeed |
| \`STRIPE_WEBHOOK_SECRET\` | secret | yes before Stripe can call the webhook |
| \`RESEND_API_KEY\` | secret | optional; needed for receipt and recovery email |
| \`PREMIUM_FROM_EMAIL\` | plain text or secret | optional; default \`FrenchyFab <hello@frenchyfab.com>\` |

A script upload that omits a binding removes it. Include every name above in the metadata. Put secret values with the Workers secrets API, not in the module.

Move \`BREVO_API_KEY\` off plain text onto a secret. Until \`STRIPE_SECRET_KEY\` and \`STRIPE_WEBHOOK_SECRET\` are set, payment routes return HTTP 503 and do not unlock anyone.

## Webhook

- URL: \`https://care-plan.frenchyfab.com/functions/v1/stripe-webhook\`
- Events: \`checkout.session.completed\`, \`checkout.session.async_payment_succeeded\`

The vault price is \`price_1TFD07GCqwm95OGXc26k5JkI\`. The fridge-card add-on is \`price_1THjRhGCqwm95OGXJZf9x553\`. Other products on the same Stripe account stay locked.

## Smoke tests after deploy

\`\`\`bash
curl -sSI https://care-plan.frenchyfab.com/ | head
curl -sS -o /dev/null -w "%{http_code}\\n" -X POST https://care-plan.frenchyfab.com/functions/v1/stripe-webhook -H 'Content-Type: application/json' -d '{}'
curl -sS -X POST https://care-plan.frenchyfab.com/functions/v1/verify-payment -H 'Content-Type: application/json' -d '{"sessionId":"cs_fake_audit"}'
curl -sS -X POST https://care-plan.frenchyfab.com/api/ffab-care/v1/lead -H 'Content-Type: application/json' -d '{}'
\`\`\`

Expected before secrets: the HTML response is 200 with \`content-security-policy\` and \`strict-transport-security\`. The webhook and verify calls return 503, not a paid body. The empty lead returns 400.

After \`STRIPE_WEBHOOK_SECRET\` is set, the same unsigned webhook curl must return 400.
`;
writeFileSync(join(artifactDir, "deploy-notes.md"), notes);
console.log("wrote", join(artifactDir, "careplan-worker.js"));
