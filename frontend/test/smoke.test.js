import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Catalog has all 11 banks and 7 loan types", () => {
  const catalogPath = path.resolve(__dirname, "../src/catalog.json");
  assert(fs.existsSync(catalogPath), "catalog.json should exist");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));

  assert.strictEqual(catalog.banks.length, 11, "Should have 11 banks");
  assert.strictEqual(catalog.loan_types.length, 7, "Should have 7 loan types");

  const bankIds = catalog.banks.map((b) => b.id);
  assert(bankIds.includes("PNB"), "Should include PNB");
  assert(bankIds.includes("BOB"), "Should include BOB");
  assert(bankIds.includes("Bajaj"), "Should include Bajaj");

  const loanIds = catalog.loan_types.map((l) => l.id);
  assert(loanIds.includes("gold"), "Should include gold loan");
  assert(loanIds.includes("business"), "Should include business loan");
  assert(loanIds.includes("lap"), "Should include loan against property");
});

test("i18n configuration contains en, ta, hi keys", () => {
  const i18nPath = path.resolve(__dirname, "../src/i18n.js");
  assert(fs.existsSync(i18nPath), "i18n.js should exist");
  const content = fs.readFileSync(i18nPath, "utf-8");

  assert(content.includes("en: {"), "Should contain English resources");
  assert(content.includes("ta: {"), "Should contain Tamil resources");
  assert(content.includes("hi: {"), "Should contain Hindi resources");
  assert(content.includes("TODO: human review"), "Should flag machine-translated strings");
});

test("Index.css has light theme definitions", () => {
  const cssPath = path.resolve(__dirname, "../src/index.css");
  assert(fs.existsSync(cssPath), "index.css should exist");
  const content = fs.readFileSync(cssPath, "utf-8");

  assert(content.includes('[data-theme="light"]'), "Should define light theme styles");
});
