import { useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compact(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function Login({ keys, onClose, onActivate }) {
  const [step, setStep] = useState("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function continueDetails(event) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !EMAIL.test(email.trim())) {
      setError("Enter your name, surname, and a valid email address.");
      return;
    }
    setError("");
    setStep("key");
  }

  function submitKey(event) {
    event.preventDefault();
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
    if (match.email && match.email.toLowerCase() !== email.trim().toLowerCase()) {
      setError("That license key does not match this email.");
      return;
    }
    onActivate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      key: match,
    });
  }

  return (
    <section className="portal login-page" aria-labelledby="login-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">edgeX</p>
          <h2 id="login-title">{step === "details" ? "Activate" : "License key"}</h2>
        </div>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            if (step === "key") {
              setError("");
              setStep("details");
              return;
            }
            onClose();
          }}
        >
          Back
        </button>
      </header>
      <img className="login-logo" src="/edgex-logo.png" alt="" />
      {step === "details" ? (
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
      ) : (
        <form className="portal-form" onSubmit={submitKey}>
          <p className="setting-copy">Enter the license key for this email.</p>
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
