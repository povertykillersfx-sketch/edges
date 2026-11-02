const NAV = ["Home", "Services", "Process", "Team", "Reviews", "FAQ", "Contact"];

export function SiteRenderer({
  config = {},
  templateId = "agency-signal",
  mode = "desktop",
  selectedKey = "",
  onSelectField,
}) {
  const c = config || {};
  const brand = c.businessName || "Studio";
  const headline = c.headline || `Halo ${brand}.`;
  const tagline = c.tagline || "We develop custom digital solutions for innovative companies.";
  const about = c.about || "We help ambitious teams ship premium brand experiences with clarity, speed, and craft.";
  const services = Array.isArray(c.services) && c.services.length
    ? c.services
    : [
        { name: "Product design", price: "", description: "Systems, interfaces, and launch-ready flows." },
        { name: "Engineering", price: "", description: "Reliable builds with clean architecture." },
        { name: "Growth", price: "", description: "Conversion-focused iteration after launch." },
      ];
  const accent = c.accentColor || "#8b5cf6";
  const ctaText = c.ctaText || "Get in Touch";
  const ctaUrl = c.ctaUrl || "#contact";
  const select = (key) => () => onSelectField?.(key);

  return (
    <div
      id="top"
      className={`ss-site ss-site--aeon ss-site--${mode} ss-site--${templateId}`}
      style={{
        "--ss-site-accent": accent,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}
    >
      <div className="ss-site-glow" aria-hidden="true" />
      <div className="ss-site-watermark" aria-hidden="true">
        {brand}
      </div>

      <header className="ss-site-nav">
        <button type="button" className={`ss-site-brand ${selectedKey === "businessName" ? "is-selected" : ""}`} onClick={select("businessName")}>
          {c.logo ? <img src={c.logo} alt="" className="ss-site-logo" /> : (
            <span className="ss-site-marks" aria-hidden="true">
              <i /><i />
            </span>
          )}
          <strong>{brand}</strong>
        </button>
        <nav className="ss-site-links" aria-label="Primary">
          {NAV.map((label) => (
            <a key={label} href={label === "Contact" ? "#contact" : label === "Services" ? "#services" : "#top"}>
              {label}
            </a>
          ))}
        </nav>
        <a className="ss-site-nav-cta" href={ctaUrl} onClick={select("ctaText")}>
          {ctaText}
        </a>
      </header>

      <section className="ss-site-hero">
        <button
          type="button"
          className={`ss-site-hero-title ${selectedKey === "headline" ? "is-selected" : ""}`}
          onClick={select("headline")}
        >
          <h1>{headline}</h1>
        </button>
        <button
          type="button"
          className={`ss-site-tagline ${selectedKey === "tagline" ? "is-selected" : ""}`}
          onClick={select("tagline")}
        >
          {tagline}
        </button>
        <button type="button" className={`ss-site-connect ${selectedKey === "ctaText" ? "is-selected" : ""}`} onClick={select("ctaText")}>
          Connect Us →
        </button>
      </section>

      <section className="ss-site-section ss-site-about" id="about">
        <h2>
          What we&apos;re all <em>about.</em>
        </h2>
        <button
          type="button"
          className={`ss-site-about-copy ${selectedKey === "about" ? "is-selected" : ""}`}
          onClick={select("about")}
        >
          {about}
        </button>
      </section>

      <section className="ss-site-section" id="services">
        <div className={`ss-site-grid ${selectedKey === "services" ? "is-selected" : ""}`} onClick={select("services")}>
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

      <section className="ss-site-section ss-site-contact-block" id="contact">
        <h2>Get in touch.</h2>
        <ul className="ss-site-contact">
          {c.phone ? <li onClick={select("phone")}>{c.phone}</li> : null}
          {c.email ? <li onClick={select("email")}>{c.email}</li> : null}
          {c.whatsapp ? (
            <li onClick={select("whatsapp")}>
              <a href={c.whatsapp}>WhatsApp</a>
            </li>
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
