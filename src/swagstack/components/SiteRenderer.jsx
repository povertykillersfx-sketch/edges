export function SiteRenderer({ config = {}, templateId = "barber-noir", mode = "desktop" }) {
  const c = config || {};
  const primary = c.primaryColor || "#071428";
  const accent = c.accentColor || "#22d3ee";
  const font = c.fontFamily || "Space Grotesk";
  const services = Array.isArray(c.services) ? c.services : [];

  return (
    <div
      className={`ss-site ss-site--${mode} ss-site--${templateId}`}
      style={{
        "--ss-primary": primary,
        "--ss-accent": accent,
        fontFamily: `"${font}", "Space Grotesk", sans-serif`,
      }}
    >
      <header className="ss-site-nav">
        <div className="ss-site-brand">
          {c.logo ? <img src={c.logo} alt="" className="ss-site-logo" /> : null}
          <strong>{c.businessName || "Business"}</strong>
        </div>
        <a className="ss-site-nav-cta" href={c.ctaUrl || "#contact"}>
          {c.ctaText || "Contact"}
        </a>
      </header>

      <section className="ss-site-hero" style={c.heroImage ? { backgroundImage: `linear-gradient(120deg, ${primary}ee, ${primary}88), url(${c.heroImage})` } : undefined}>
        <p className="ss-site-kicker">SwagStack</p>
        <h1>{c.headline || c.businessName || "Your headline"}</h1>
        <p className="ss-site-tagline">{c.tagline || ""}</p>
        <a className="ss-site-cta" href={c.ctaUrl || "#contact"}>
          {c.ctaText || "Get started"}
        </a>
      </section>

      {c.about ? (
        <section className="ss-site-section">
          <h2>About</h2>
          <p>{c.about}</p>
        </section>
      ) : null}

      {services.length ? (
        <section className="ss-site-section" id="services">
          <h2>{templateId === "bistro-pulse" ? "Menu" : templateId === "trade-edge" ? "Programs" : "Services"}</h2>
          <div className="ss-site-grid">
            {services.map((item) => (
              <article key={`${item.name}-${item.price}`} className="ss-site-offer">
                <div className="ss-site-offer-top">
                  <h3>{item.name}</h3>
                  {item.price ? <span>R{item.price}</span> : null}
                </div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ss-site-section" id="contact">
        <h2>Contact</h2>
        <ul className="ss-site-contact">
          {c.phone ? <li>Phone: {c.phone}</li> : null}
          {c.email ? <li>Email: {c.email}</li> : null}
          {c.whatsapp ? (
            <li>
              <a href={c.whatsapp}>WhatsApp</a>
            </li>
          ) : null}
          {c.instagram ? (
            <li>
              <a href={c.instagram}>Instagram</a>
            </li>
          ) : null}
        </ul>
      </section>

      <footer className="ss-site-footer">
        <span>{c.seoTitle || c.businessName || "Site"}</span>
        <span>Built with SwagStack</span>
      </footer>
    </div>
  );
}
