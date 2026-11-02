/** Canonical Aeon/Pixably demo defaults for canvas visual system. */
export const DEMO_SITE_ID = "dff26228-342e-46dc-be16-aaa15ff5f108";

export function aeonDefaultConfig(brand = "Signal Labs") {
  return {
    businessName: brand,
    headline: `Halo ${brand}.`,
    tagline: "We develop custom digital solutions for innovative companies.",
    logo: "",
    heroImage: "",
    primaryColor: "#0b0b0b",
    accentColor: "#8b5cf6",
    fontFamily: "Plus Jakarta Sans",
    about:
      "We partner with ambitious teams to design, ship, and scale brand websites that feel premium from the first viewport.",
    services: [
      { name: "Product design", price: "", description: "Systems, interfaces, and launch-ready flows." },
      { name: "Engineering", price: "", description: "Reliable builds with clean architecture." },
      { name: "Growth", price: "", description: "Conversion-focused iteration after launch." },
    ],
    phone: "+27 00 000 0000",
    email: "hello@example.com",
    whatsapp: "",
    instagram: "",
    ctaText: "Get in Touch",
    ctaUrl: "#contact",
    seoTitle: brand,
    seoDescription: `${brand} — powered by SwagStack.`,
    _aeonReset: 2,
  };
}

export function shouldResetAeonDraft(draft) {
  if (!draft || typeof draft !== "object") return true;
  if (draft._aeonReset === 2) return false;
  // Old drafts that spoil the look
  const headline = String(draft.headline || "");
  if (!/^Halo\s+/i.test(headline)) return true;
  if (draft.primaryColor && draft.primaryColor !== "#0b0b0b" && draft.primaryColor !== "#000000") return true;
  if (draft.fontFamily && draft.fontFamily !== "Plus Jakarta Sans") return true;
  return draft._aeonReset !== 2;
}
