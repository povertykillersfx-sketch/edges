import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeText,
  slugify,
  validateColor,
  validateEmail,
  validatePassword,
  validateSlug,
  validateUpload,
  validateUrl,
  validateWebsiteConfig,
  stripScripts,
} from "./validation.js";

test("validateEmail accepts normal addresses", () => {
  assert.equal(validateEmail("owner@example.com").ok, true);
});

test("validateEmail rejects junk", () => {
  assert.equal(validateEmail("not-an-email").ok, false);
});

test("validatePassword enforces length", () => {
  assert.equal(validatePassword("short").ok, false);
  assert.equal(validatePassword("longenough").ok, true);
});

test("slugify and validateSlug", () => {
  assert.equal(slugify("Neon Fade!!"), "neon-fade");
  assert.equal(validateSlug("neon-fade").ok, true);
  assert.equal(validateSlug("admin").ok, false);
});

test("validateColor and validateUrl", () => {
  assert.equal(validateColor("#22d3ee").ok, true);
  assert.equal(validateColor("blue").ok, false);
  assert.equal(validateUrl("https://example.com").ok, true);
  assert.equal(validateUrl("javascript:alert(1)").ok, false);
});

test("stripScripts removes script and handlers", () => {
  const cleaned = stripScripts({
    about: '<script>alert(1)</script>Hello',
    ctaUrl: "javascript:alert(1)",
  });
  assert.equal(cleaned.about.includes("script"), false);
  assert.equal(cleaned.ctaUrl.includes("javascript:"), false);
});

test("validateWebsiteConfig cleans services", () => {
  const result = validateWebsiteConfig(
    {
      businessName: "Test",
      primaryColor: "#112233",
      services: [{ name: "Cut", price: "100", description: "Fade" }],
    },
    [
      { key: "businessName", label: "Business name", type: "text" },
      { key: "primaryColor", label: "Primary color", type: "color" },
      { key: "services", label: "Services", type: "services" },
    ]
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.services[0].name, "Cut");
});

test("validateUpload rejects bad mime and oversized files", () => {
  assert.equal(validateUpload({ type: "application/pdf", size: 10 }).ok, false);
  assert.equal(validateUpload({ type: "image/png", size: 10 }).ok, true);
  assert.equal(validateUpload({ type: "image/png", size: 6 * 1024 * 1024 }).ok, false);
});

test("sanitizeText strips angle brackets", () => {
  assert.equal(sanitizeText("<b>Hi</b>"), "bHi/b");
});
