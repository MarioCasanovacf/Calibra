import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the complete Antigravity handoff in the product UI", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /Centro Antigravity/);
  assert.match(page, /Copiar instrucciones/);
  assert.match(page, /Validar e importar/);
  assert.match(page, /Aplicaría/);
  assert.match(page, /Programa la rutina diaria/);
  assert.match(page, /\/api\/antigravity\/export/);
  assert.match(page, /\/api\/antigravity\/import/);
});

test("keeps the Antigravity protocol auditable and model-API free", async () => {
  const [protocol, importRoute, schema, packageJson] = await Promise.all([
    source("lib/antigravity.ts"),
    source("app/api/antigravity/import/route.ts"),
    source("db/schema.ts"),
    source("package.json"),
  ]);

  assert.match(protocol, /calibra\.antigravity\.v1/);
  assert.match(protocol, /Nunca autoaplicar/);
  assert.match(protocol, /evidence\.verification\.status/);
  assert.match(importRoute, /normalizeUrl/);
  assert.match(importRoute, /duplicates/);
  assert.match(schema, /humanDecision/);
  assert.match(schema, /agentRuns/);
  assert.doesNotMatch(packageJson, /openai|google-generativeai|anthropic/i);
});
