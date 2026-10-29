export function SiteRenderer({ config = {}, templateId = "agency-signal", mode = "desktop" }) {
  const c = config || {};
  const brand = c.businessName || "Studio";
  const headline = c.headline || `Halo ${brand}.`;
  const tagline = c.tagline || "We craft premium digital experiences for ambitious brands.";
  const about = c.about || "";
  const services = Array.isArray(c.services) ? c.services : [];
  const accent = c.accentColor || "#8b5cf6";
  const ctaText = c.ctaText || "Get in Touch";
  const ctaUrl = c.ctaUrl || "#contact";
  const navLinks = [
    { label: "Home", href: "#top" },
    { label: "Services", href: "#services" },
    { label: "Process", href: "#about" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div
      id="top"
      className={`ss-site ss-site--aeon ss-site--${mode} ss-site--${templateId}`}
      style={{
        "--ss-site-accent": accent,
        fontFamily: '"Plus Jakarta Sans", "Sora", sans-serif',
      }}
    >
      <div className="ss-site-glow" aria-hidden="true" />
      <div className="ss-site-watermark" aria-hidden="true">
        {brand}
      </div>

      <header className="ss-site-nav">
        <div className="ss-site-brand">
          {c.logo ? <img src={c.logo} alt="" className="ss-site-logo" /> : <span className="ss-site-mark" />}
          <strong>{brand}</strong>
        </div>
        <nav className="ss-site-links" aria-label="Primary">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="ss-site-nav-cta" href={ctaUrl}>
          {ctaText}
        </a>
      </header>

      <section className="ss-site-hero">
        <h1>{headline}</h1>
        <p className="ss-site-tagline">{tagline}</p>
        <div className="ss-site-hero-actions">
          <a className="ss-site-cta" href={ctaUrl}>
            {ctaText}
          </a>
          <a className="ss-site-cta-ghost" href="#about">
            Learn more
          </a>
        </div>
      </section>

      <section className="ss-site-section ss-site-about" id="about">
        <h2>What we&apos;re all about.</h2>
        {about ? <p className="ss-site-about-copy">{about}</p> : null}
      </section>

      {services.length ? (
        <section className="ss-site-section" id="services">
          <div className="ss-site-grid">
            {services.map((item) => (
              <article key={`${item.name}-${item.price}`} className="ss-site-offer">
                <div className="ss-site-offer-top">
                  <h3>{item.name}</h3>
                  {item.price ? <span>{/^\d/.test(String(item.price)) ? `R${item.price}` : item.price}</span> : null}
                </div>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ss-site-section ss-site-contact-block" id="contact">
        <h2>Get in touch.</h2>
        <ul className="ss-site-contact">
          {c.phone ? <li>{c.phone}</li> : null}
          {c.email ? <li>{c.email}</li> : null}
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
          {!c.phone && !c.email && !c.whatsapp && !c.instagram ? (
            <li className="ss-site-contact-fallback">Tell visitors how to reach you from the editor.</li>
          ) : null}
        </ul>
      </section>

      <footer className="ss-site-footer">
        <span>{c.seoTitle || brand}</span>
        <span>Built with SwagStack</span>
      </footer>
    </div>
  );
}
