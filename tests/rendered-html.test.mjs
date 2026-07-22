import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("defines the required app routes", async () => {
  const [home, onboarding, admin, data] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/onboarding-client.tsx", root), "utf8"),
    readFile(new URL("app/admin/page.tsx", root), "utf8"),
    readFile(new URL("app/data/page.tsx", root), "utf8"),
  ]);

  assert.match(home, /<OnboardingClient \/>/);
  assert.match(onboarding, /Thank you/);
  assert.match(onboarding, /api\/onboarding\/session", \{ method: "DELETE" \}/);
  assert.doesNotMatch(onboarding, /Submit credentials first/);
  assert.match(admin, /<AdminClient \/>/);
  assert.match(data, /<DataClient \/>/);
});

test("keeps the database-backed API surfaces in place", async () => {
  const [schema, accountRoute, profileRoute, configRoute, usersRoute, db] =
    await Promise.all([
      readFile(new URL("db/schema.sql", root), "utf8"),
      readFile(new URL("app/api/onboarding/account/route.ts", root), "utf8"),
      readFile(new URL("app/api/onboarding/profile/route.ts", root), "utf8"),
      readFile(new URL("app/api/config/route.ts", root), "utf8"),
      readFile(new URL("app/api/users/route.ts", root), "utf8"),
      readFile(new URL("db/index.ts", root), "utf8"),
    ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS onboarding_config/);
  assert.match(schema, /sort_order/);
  assert.match(db, /DATABASE_URL/);
  assert.match(db, /from "postgres"/);
  assert.match(accountRoute, /hashPassword/);
  assert.match(profileRoute, /validateFields/);
  assert.match(configRoute, /validateConfigPayload/);
  assert.match(usersRoute, /readUsers/);
});

test("removes starter preview and hosting-specific files", async () => {
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  const packageConfig = JSON.parse(packageJson);
  const packageNames = [
    ...Object.keys(packageConfig.dependencies ?? {}),
    ...Object.keys(packageConfig.devDependencies ?? {}),
  ].join("\n");

  assert.match(layout, /title:\s*"Support IQ Onboarding"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
  assert.doesNotMatch(
    packageNames,
    /react-loading-skeleton|vinext|wrangler|drizzle|cloudflare/i
  );
  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", root))
  );
  await assert.rejects(access(new URL("app/_sites-preview/preview.css", root)));
  await assert.rejects(access(new URL(".openai/hosting.json", root)));
  await assert.rejects(access(new URL("worker/index.ts", root)));
  await assert.rejects(access(new URL("vite.config.ts", root)));
});
