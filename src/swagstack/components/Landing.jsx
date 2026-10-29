import { navigateStudio } from "../lib/path.js";

export function StudioLanding({ signedIn }) {
  return (
    <div className="ss-landing">
      <div className="ss-landing-glow" aria-hidden="true" />
      <header className="ss-landing-nav">
        <strong className="ss-brand-mark">SwagStack Studio</strong>
        <div className="ss-landing-nav-actions">
          {signedIn ? (
            <button type="button" className="ss-btn ss-btn-primary" onClick={() => navigateStudio("/studio/dashboard")}>
              Open dashboard
            </button>
          ) : (
            <>
              <button type="button" className="ss-btn" onClick={() => navigateStudio("/studio/login")}>
                Sign in
              </button>
              <button type="button" className="ss-btn ss-btn-primary" onClick={() => navigateStudio("/studio/signup")}>
                Start free
              </button>
            </>
          )}
        </div>
      </header>

      <main className="ss-landing-hero">
        <p className="ss-brand-mark ss-brand-hero">SwagStack</p>
        <h1>Customize. Preview. Publish.</h1>
        <p>
          Multi-tenant website customizer for barbers, restaurants, traders, agencies, and local services —
          with locked layouts and editable fields.
        </p>
        <div className="ss-cta-row">
          <button type="button" className="ss-btn ss-btn-primary" onClick={() => navigateStudio(signedIn ? "/studio/templates" : "/studio/signup")}>
            {signedIn ? "Choose a template" : "Create account"}
          </button>
          <button type="button" className="ss-btn" onClick={() => navigateStudio("/studio/templates")}>
            View templates
          </button>
        </div>
      </main>
    </div>
  );
}

export function PublishedSite({ slug }) {
  // Lazy-loaded content via parent; this is a loading/error shell used only if needed.
  return (
    <div className="ss-published-shell">
      <p className="ss-muted">Loading /s/{slug}…</p>
    </div>
  );
}
