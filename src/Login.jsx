import { useEffect, useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compact(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function resumeSignup(subscriptions) {
  return (
    subscriptions.find((item) => item.status === "pending") ??
    subscriptions.find((item) => item.status === "approved" && !item.keyId) ??
    null
  );
}

export function Login({ subscriptions, keys, onClose, onSignup, onActivate }) {
  const open = resumeSignup(subscriptions ?? []);
  const [step, setStep] = useState(open ? (open.status === "approved" ? "key" : "waiting") : "details");
  const [signupId, setSignupId] = useState(open?.id ?? "");
  const [firstName, setFirstName] = useState(open?.firstName ?? "");
  const [lastName, setLastName] = useState(open?.lastName ?? "");
  const [email, setEmail] = useState(open?.email ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const signup = (subscriptions ?? []).find((item) => item.id === signupId) ?? null;

  useEffect(() => {
    if (!signup) return;
    if (signup.status === "approved" && step === "waiting") setStep("key");
    if (signup.status === "declined" && step === "waiting") setStep("declined");
  }, [signup, step]);

  function continueDetails(event) {
    event.preventDefault();
    const name = firstName.trim();
    const surname = lastName.trim();
    const address = email.trim();
    if (!name || !surname || !EMAIL.test(address)) {
      setError("Enter your name, surname, and a valid email address.");
      return;
    }
    const existing = (subscriptions ?? []).find(
      (item) => item.email.toLowerCase() === address.toLowerCase() && item.status === "pending"
    );
    if (existing) {
      setSignupId(existing.id);
      setStep("waiting");
      setError("");
      return;
    }
    const created = onSignup({ firstName: name, lastName: surname, email: address });
    setSignupId(created.id);
    setFirstName(created.firstName);
    setLastName(created.lastName);
    setEmail(created.email);
    setError("");
    setStep("waiting");
  }

  function submitKey(event) {
    event.preventDefault();
    if (!signup || signup.status !== "approved") {
      setError("Wait for an admin to approve this signup.");
      setStep("waiting");
      return;
    }
    const typed = compact(code);
    if (!typed) {
      setError("Enter the license key.");
      return;
    }
    const match = (keys ?? []).find((item) => compact(item.code) === typed);
    if (!match) {
      setError("That license key was not found.");
      return;
    }
    if (match.status !== "active") {
      setError("That license key is revoked.");
      return;
    }
    const address = (signup.email || email).trim().toLowerCase();
    if (match.email && match.email.toLowerCase() !== address) {
      setError("That license key does not match this email.");
      return;
    }
    onActivate({
      firstName: signup.firstName || firstName.trim(),
      lastName: signup.lastName || lastName.trim(),
      email: signup.email || email.trim(),
      key: match,
      signupId: signup.id,
    });
  }

  const title = step === "key" ? "License key" : step === "declined" ? "Declined" : step === "waiting" ? "Waiting" : "Activate";

  return (
    <section className="portal login-page" aria-labelledby="login-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">edgeX</p>
          <h2 id="login-title">{title}</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Back
        </button>
      </header>
      <img className="login-logo" src="/edgex-logo.png" alt="" />
      {step === "details" && (
        <form className="portal-form" onSubmit={continueDetails}>
          <label>
            Name
            <input
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setError("");
              }}
              placeholder="Name"
              autoComplete="given-name"
            />
          </label>
          <label>
            Surname
            <input
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setError("");
              }}
              placeholder="Surname"
              autoComplete="family-name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="Email address"
              autoComplete="email"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="connect-btn">
            Activate
          </button>
        </form>
      )}
      {step === "waiting" && (
        <div className="portal-form">
          <p className="setting-title">{signup?.holder || `${firstName} ${lastName}`}</p>
          <p className="setting-copy">
            This signup is on Subscriptions. An admin has to approve it before you can enter a license key.
          </p>
        </div>
      )}
      {step === "declined" && (
        <div className="portal-form">
          <p className="setting-copy">This signup was declined.</p>
          <button
            type="button"
            className="connect-btn"
            onClick={() => {
              setSignupId("");
              setFirstName("");
              setLastName("");
              setEmail("");
              setError("");
              setStep("details");
            }}
          >
            Sign up again
          </button>
        </div>
      )}
      {step === "key" && (
        <form className="portal-form" onSubmit={submitKey}>
          <p className="setting-copy">Approved. Enter the license key for {signup?.email || email}.</p>
          <label>
            License key
            <input
              className="license-input"
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
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="connect-btn">
            Activate
          </button>
        </form>
      )}
    </section>
  );
}
