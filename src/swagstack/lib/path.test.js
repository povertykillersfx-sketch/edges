import test from "node:test";
import assert from "node:assert/strict";
import { isSwagStackPath, parseStudioRoute, studioPath } from "./path.js";

test("studioPath normalizes trailing slashes", () => {
  assert.equal(studioPath("/studio/"), "/studio");
  assert.equal(studioPath("/studio/dashboard/"), "/studio/dashboard");
});

test("isSwagStackPath detects studio and published routes", () => {
  assert.equal(isSwagStackPath("/studio"), true);
  assert.equal(isSwagStackPath("/studio/login"), true);
  assert.equal(isSwagStackPath("/s/neon-fade"), true);
  assert.equal(isSwagStackPath("/admin"), false);
  assert.equal(isSwagStackPath("/"), false);
});

test("parseStudioRoute maps known paths", () => {
  assert.equal(parseStudioRoute("/studio").name, "home");
  assert.equal(parseStudioRoute("/studio/login").name, "login");
  assert.equal(parseStudioRoute("/studio/sites/abc/edit").name, "editor");
  assert.equal(parseStudioRoute("/studio/sites/abc/edit").websiteId, "abc");
  assert.equal(parseStudioRoute("/studio/admin/customers").tab, "customers");
  assert.equal(parseStudioRoute("/s/my-shop").name, "published");
  assert.equal(parseStudioRoute("/s/my-shop").slug, "my-shop");
});
