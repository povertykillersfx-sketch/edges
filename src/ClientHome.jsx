import { useState } from "react";
import { installClientApp, installOnArrivalPending, isAndroid, isIos } from "./pwa.js";
import "./landing.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compact(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function Step({ n, title, children }) {
  return (
    <article>
      <span>{n}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

export function ClientHome({ onSignIn, onCreate, onCheckPaid, onFindKey, onActivate }) {
  const [installNote, setInstallNote] = useState(() =>
    installOnArrivalPending() ? "Tap Download to install the client app on this phone." : ""
  );
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signup, setSignup] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function download() {
    if (isIos()) {
      document.getElementById("ios")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const result = await installClientApp();
    if (result === "accepted") {
      setInstallNote("");
      return;
    }
    if (result === "unavailable") {
      setInstallNote(
        isAndroid()
          ? "The install prompt is not ready yet. Open the Chrome menu and choose Install app."
          : "Open this page in Chrome on your Android phone and tap Download."
      );
    }
  }

  function startSignup(event) {
    event.preventDefault();
    const firstName = name.trim();
    const lastName = surname.trim();
    const address = email.trim();
    if (!firstName || !lastName || !EMAIL.test(address)) {
      setError("Enter your name, surname, and a valid email address.");
      return;
    }
    try {
      const created = onCreate({ firstName, lastName, email: address });
      if (!created?.id) {
        setError("The signup did not reach the desk. Check the connection and try again.");
        return;
      }
      setSignup(created);
      setName(created.firstName || firstName);
      setSurname(created.lastName || lastName);
      setEmail(created.email || address);
      setError("");
    } catch {
      setError("The signup did not reach the desk. Check the connection and try again.");
    }
  }

  async function confirmPaid() {
    const typed = compact(code);
    if (!typed) {
      setError("Enter the license key your mentor sent you.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const latest = await onCheckPaid({ id: signup?.id, email: signup?.email || email });
      if (latest?.status === "declined") {
        setError("This signup was declined.");
        return;
      }
      if (latest?.status !== "approved" && latest?.status !== "active") {
        setError("The R400 payment is not confirmed yet. Pay the app unlock, then tap I've paid again.");
        return;
      }
      const match = await onFindKey(typed);
      if (!match) {
        setError("That license key was not found.");
        return;
      }
      if (match.status !== "active") {
        setError("That license key is revoked.");
        return;
      }
      const address = (signup?.email || email).trim().toLowerCase();
      if (match.email && match.email.toLowerCase() !== address) {
        setError("That license key does not match this email.");
        return;
      }
      onActivate({
        firstName: signup?.firstName || name.trim(),
        lastName: signup?.lastName || surname.trim(),
        email: signup?.email || email.trim(),
        key: match,
        signupId: latest.id || signup?.id,
      });
    } catch {
      setError("The desk did not respond. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="landing client-home">
      <header className="landing-bar">
        <div className="landing-col landing-bar-inner">
          <a className="landing-brand" href="#top">
            <img className="landing-mark" src="/ea-hosting-logo.png" alt="" />
            <span>
              <strong>
                EA Host <em>Hub</em>
              </strong>
              <small>Client app</small>
            </span>
          </a>
        </div>
      </header>
      <main id="top">
        <section className="landing-hero">
          <div className="landing-col">
            <img className="client-home-logo" src="/icons/icon-192.png" alt="" />
            <h1>
              Install EA Host Hub <span>on your phone.</span>
            </h1>
            <p className="landing-lead">
              Follow the Android or iPhone steps, then sign up, pay the R400 once-off unlock, and enter the license key from your mentor.
            </p>
            <div className="landing-cta">
              <button type="button" className="landing-gradient" onClick={download}>
                Download
              </button>
              {installNote && <p className="landing-install-note">{installNote}</p>}
              <div className="client-home-jumps">
                <a href="#android">Android steps</a>
                <a href="#ios">iPhone steps</a>
                <a href="#signup">Sign up</a>
              </div>
              <button type="button" className="landing-outline" onClick={onSignIn}>
                Log in
              </button>
            </div>
          </div>
        </section>

        <section id="android" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill">
              <i /> Android
            </p>
            <h2>Download on Android</h2>
            <p className="landing-lead">Use Chrome. The install prompt is the free app download, with no Play Store.</p>
            <div className="client-home-steps">
              <Step n="1" title="Open Chrome">
                Go to app.eahosthub.co.za in Chrome on your Android phone.
              </Step>
              <Step n="2" title="Tap Download">
                Use the Download button on this page.
              </Step>
              <Step n="3" title="Tap Install">
                Chrome shows the install prompt. Tap Install.
              </Step>
              <Step n="4" title="Use the Chrome menu if needed">
                If the prompt is not there, tap the three-dot menu and choose Install app.
              </Step>
              <Step n="5" title="Open the home-screen icon">
                Open EA Host Hub from your home screen, then continue to Sign up.
              </Step>
            </div>
            <div className="landing-cta">
              <button type="button" className="landing-gradient" onClick={download}>
                Download
              </button>
            </div>
          </div>
        </section>

        <section id="ios" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill">
              <i /> iPhone and iPad
            </p>
            <h2>Add the app on iPhone</h2>
            <p className="landing-lead">Use Safari. iPhone installs the app from the share menu, not the App Store.</p>
            <div className="client-home-steps">
              <Step n="1" title="Open Safari">
                Go to app.eahosthub.co.za in Safari.
              </Step>
              <Step n="2" title="Tap Share">
                Tap the Share icon at the bottom of Safari.
              </Step>
              <Step n="3" title="Add to Home Screen">
                Scroll down and tap Add to Home Screen.
              </Step>
              <Step n="4" title="Confirm">
                Tap Add. The EA Host Hub icon appears on your home screen.
              </Step>
              <Step n="5" title="Open the icon">
                Open the app from your home screen, then continue to Sign up.
              </Step>
            </div>
          </div>
        </section>

        <section id="signup" className="landing-section">
          <div className="landing-col">
            <p className="landing-pill">
              <i /> Sign up
            </p>
            <h2>Sign up and pay</h2>
            <p className="landing-lead">
              The app unlock is R400 once-off. Enter the license key your mentor sent you, pay the unlock, then tap I've paid.
            </p>
            {!signup ? (
              <form className="client-home-form" onSubmit={startSignup}>
                <label>
                  Name
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="given-name" />
                </label>
                <label>
                  Surname
                  <input value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="Surname" autoComplete="family-name" />
                </label>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" />
                </label>
                <label>
                  License key from your mentor
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="EDGX-XXXX-XXXX-XXXX"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </label>
                {error && <p className="landing-error">{error}</p>}
                <button type="submit" className="landing-gradient">
                  Continue to payment
                </button>
              </form>
            ) : (
              <form
                className="client-home-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmPaid();
                }}
              >
                <div className="client-home-pay">
                  <p>App unlock</p>
                  <strong>R400 once-off</strong>
                  <span>Pay this fee to unlock the client app. Your mentor confirms the payment on the desk.</span>
                </div>
                <label>
                  License key from your mentor
                  <input
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value);
                      setError("");
                    }}
                    placeholder="EDGX-XXXX-XXXX-XXXX"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </label>
                <p className="client-home-pay-note">
                  Signed up as {signup.email}. Enter the key your mentor gave you, then tap I've paid after the R400 is confirmed.
                </p>
                {error && <p className="landing-error">{error}</p>}
                <button type="submit" className="landing-gradient" disabled={busy}>
                  {busy ? "Checking" : "I've paid"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
