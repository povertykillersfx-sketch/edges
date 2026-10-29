import { useEffect, useState } from "react";
import { isRemote, supabase } from "../supabase.js";
import { fetchProfile, getPublishedBySlug, getSessionUser, signOut } from "./lib/api.js";
import { parseStudioRoute, navigateStudio, withBase, assignStudio } from "./lib/path.js";
import { LoginScreen, ResetScreen, SignupScreen } from "./components/AuthScreens.jsx";
import { Dashboard, TemplateLibrary } from "./components/Dashboard.jsx";
import { Editor } from "./components/Editor.jsx";
import { AdminDashboard } from "./components/Admin.jsx";
import { AccountPage, BillingPage } from "./components/Billing.jsx";
import { DomainsPage } from "./components/Domains.jsx";
import { StudioLanding } from "./components/Landing.jsx";
import { SiteRenderer } from "./components/SiteRenderer.jsx";
import { getBuiltinTemplate } from "./lib/templates.js";
import "./swagstack.css";

function Shell({ profile, children, onSignOut }) {
  return (
    <div className="ss-shell">
      <header className="ss-topbar">
        <button type="button" className="ss-brand-mark ss-linkish" onClick={() => navigateStudio("/studio")}>
          SwagStack Studio
        </button>
        <nav className="ss-topnav">
          <a href={withBase("/studio/dashboard")}>Dashboard</a>
          <a href={withBase("/studio/templates")}>Templates</a>
          <a href={withBase("/studio/billing")}>Billing</a>
          <a href={withBase("/studio/account")}>Account</a>
          {profile?.role === "super_admin" ? <a href={withBase("/studio/admin/overview")}>Admin</a> : null}
        </nav>
        <div className="ss-topbar-end">
          <span className="ss-muted">{profile?.email}</span>
          <button type="button" className="ss-btn ss-btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function PublishedView({ slug }) {
  const [site, setSite] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (!isRemote) {
          const demo = getBuiltinTemplate("barber-noir");
          if (!cancel) {
            setSite({
              template_id: demo.id,
              ss_website_configs: { published: demo.default_config },
              name: demo.default_config.businessName,
            });
          }
          return;
        }
        const row = await getPublishedBySlug(slug);
        if (!row) throw new Error("This site is not published or the slug is unknown.");
        if (!cancel) setSite(row);
      } catch (err) {
        if (!cancel) setError(err.message || "Could not load published site.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

  useEffect(() => {
    const title = site?.ss_website_configs?.published?.seoTitle || site?.name;
    const description = site?.ss_website_configs?.published?.seoDescription;
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [site]);

  if (error) {
    return (
      <div className="ss-published-shell">
        <p className="ss-error">{error}</p>
        <a href={withBase("/studio")}>Back to SwagStack Studio</a>
      </div>
    );
  }
  if (!site) return <div className="ss-published-shell"><p className="ss-muted">Loading…</p></div>;

  return (
    <SiteRenderer
      config={site.ss_website_configs?.published || {}}
      templateId={site.template_id}
      mode="desktop"
    />
  );
}

export default function SwagStackApp() {
  const [route, setRoute] = useState(() => parseStudioRoute());
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bootError, setBootError] = useState("");
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    function onPop() {
      setRoute(parseStudioRoute());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const sessionUser = await getSessionUser();
        if (cancel) return;
        setUser(sessionUser);
        if (sessionUser) {
          const p = await fetchProfile(sessionUser.id);
          if (!cancel) setProfile(p);
        } else {
          setProfile(null);
          if (!isRemote) {
            setBootError("Supabase env is missing. Owner bootstrap login still works for the configured studio email.");
          }
        }
      } catch (err) {
        if (!cancel) setBootError(err.message || "Auth bootstrap failed.");
      } finally {
        if (!cancel) setReady(true);
      }
    })();

    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        const bootUser = await getSessionUser();
        if (bootUser?.bootstrap) {
          setUser(bootUser);
          setProfile(await fetchProfile(bootUser.id));
          return;
        }
        setUser(null);
        setProfile(null);
        return;
      }
      setUser(session.user);
      try {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } catch {
        setProfile(null);
      }
    });
    return () => {
      cancel = true;
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setProfile(null);
    assignStudio("/studio");
  }

  if (!ready) {
    return <div className="ss-boot">Loading SwagStack Studio…</div>;
  }

  if (route.name === "published") {
    return <PublishedView slug={route.slug} />;
  }

  if (route.name === "login") return <LoginScreen />;
  if (route.name === "signup") return <SignupScreen />;
  if (route.name === "reset") return <ResetScreen />;

  const needsAuth = ["dashboard", "templates", "editor", "billing", "account", "admin", "domains", "new-site", "site"].includes(route.name);
  if (needsAuth && !user) {
    return (
      <div className="ss-page">
        {bootError ? <p className="ss-error">{bootError}</p> : null}
        <LoginScreen />
      </div>
    );
  }

  if (route.name === "home") {
    return <StudioLanding signedIn={Boolean(user)} />;
  }

  if (profile?.status === "suspended") {
    return (
      <div className="ss-page">
        <p className="ss-error">This account is suspended. Contact support.</p>
      </div>
    );
  }

  if (!profile && user) {
    return (
      <div className="ss-page">
        <p className="ss-error">
          Signed in, but no ss_profiles row was found. Apply <code>supabase/swagstack_schema.sql</code> so the auth trigger can create profiles.
        </p>
        <button type="button" className="ss-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  let body = null;
  if (route.name === "dashboard" || route.name === "site") {
    body = <Dashboard profile={profile} onRefresh={refreshKey} />;
  } else if (route.name === "templates" || route.name === "new-site") {
    body = <TemplateLibrary profile={profile} />;
  } else if (route.name === "editor") {
    body = <Editor profile={profile} websiteId={route.websiteId} />;
  } else if (route.name === "billing") {
    body = <BillingPage profile={profile} onProfile={setProfile} />;
  } else if (route.name === "account") {
    body = <AccountPage profile={profile} onProfile={setProfile} />;
  } else if (route.name === "admin") {
    body = <AdminDashboard profile={profile} tab={route.tab} />;
  } else if (route.name === "domains") {
    body = <DomainsPage profile={profile} websiteId={route.websiteId} />;
  } else {
    body = <Dashboard profile={profile} onRefresh={refreshKey} />;
  }

  if (route.name === "editor") {
    return body;
  }

  return (
    <Shell profile={profile} onSignOut={handleSignOut}>
      {bootError ? <p className="ss-error ss-page">{bootError}</p> : null}
      {body}
    </Shell>
  );
}
