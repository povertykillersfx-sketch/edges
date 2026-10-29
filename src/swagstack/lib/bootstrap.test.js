import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD_HASH, hashPassword, matchBootstrapCredentials } from "./bootstrap.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

test("bootstrap hash is a sha256 hex digest", () => {
  assert.match(BOOTSTRAP_PASSWORD_HASH, /^[a-f0-9]{64}$/);
  assert.equal(BOOTSTRAP_EMAIL, "mukundimukhuba8@gmail.com");
});

test("hashPassword is stable", async () => {
  const a = await hashPassword("sample-pass");
  const b = await hashPassword("sample-pass");
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("matchBootstrapCredentials rejects wrong email/password", async () => {
  assert.equal(await matchBootstrapCredentials("other@example.com", "sample-pass"), false);
  assert.equal(await matchBootstrapCredentials(BOOTSTRAP_EMAIL, "definitely-not-it"), false);
});
