import { useEffect, useState } from "react";
import { MENTOR_MARKETS } from "./data.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compact(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function resumeDesk(subscriptions) {
  const pending = (subscriptions ?? []).find((item) => item.status === "pending");
  if (pending) return pending;
  return (subscriptions ?? []).find((item) => item.status === "approved" && !item.keyId) ?? null;
}

export function Login({
  subscriptions,
  mentors,
  keys,
  gate,
  onClose,
  onSignup,
  onMentorSignup,
  onActivate,
  onSignIn,
  onSecretTap,
}) {
  const open = gate ? null : resumeDesk(subscriptions);
  const [door, setDoor] = useState("app");
  const [step, setStep] = useState(() => {
    if (gate) return "signin";
    if (!open) return "details";
    if (open.status === "approved") return "key";
    return "waiting";
  });
  const [signupId, setSignupId] = useState(open?.id ?? "");
  const [firstName, setFirstName] = useState(open?.firstName ?? "");
  const [lastName, setLastName] = useState(open?.lastName ?? "");
  const [email, setEmail] = useState(open?.email ?? "");
  const [market, setMarket] = useState(MENTOR_MARKETS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const signup =
    door === "mentor"
      ? (mentors ?? []).find((item) => item.id === signupId) ?? null
      : (subscriptions ?? []).find((item) => item.id === signupId) ?? null;

  useEffect(() => {
    if (!signup || door === "mentor") {
      if (signup?.status === "approved" && step === "waiting") setStep("approved");
      if (signup?.status === "declined" && step === "waiting") setStep("declined");
      return;
    }
    if (signup.status === "approved" && step === "waiting") setStep("key");
    if (signup.status === "declined" && step === "waiting") setStep("declined");
  }, [signup, step, door]);

  function continueDetails(event) {
    event.preventDefault();
    const name = firstName.trim();
    const surname = lastName.trim();
    const address = email.trim();
    if (!name || !surname || !EMAIL.test(address)) {
      setError("Enter your name, surname, and a valid email address.");
      return;
    }
    if (door === "mentor") {
      const existing = (mentors ?? []).find(
        (item) => item.email.toLowerCase() === address.toLowerCase() && item.status === "pending"
      );
      if (existing) {
        setSignupId(existing.id);
        setStep("waiting");
        setError("");
        return;
      }
      const created = onMentorSignup({ firstName: name, lastName: surname, email: address, market });
      setSignupId(created.id);
      setFirstName(created.firstName);
      setLastName(created.lastName);
      setEmail(created.email);
      setError("");
      setStep(created.status === "approved" ? "approved" : "waiting");
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

  function signIn(event) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter your email address.");
      return;
    }
    if (door === "mentor") {
      const mentor = (mentors ?? []).find((item) => item.email.toLowerCase() === address.toLowerCase());
      if (!mentor) {
        setError("That mentor signup was not found.");
        return;
      }
      if (mentor.status === "pending") {
        setError("Wait for an admin to approve this signup.");
        return;
      }
      if (mentor.status === "declined") {
        setError("This mentor signup was declined.");
        return;
      }
      onSignIn({ role: "mentor", email: address, mentor });
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
    if (match.email && match.email.toLowerCase() !== address.toLowerCase()) {
      setError("That license key does not match this email.");
      return;
    }
    const desk = (subscriptions ?? []).find((item) => item.email.toLowerCase() === address.toLowerCase());
    if (desk?.status === "pending") {
      setError("Wait for an admin to approve this signup.");
      return;
    }
    if (desk?.status === "declined") {
      setError("This signup was declined.");
      return;
    }
    onSignIn({ role: "app", email: address, key: match, signup: desk });
  }

  function openPage(nextDoor, nextStep) {
    setDoor(nextDoor);
    setStep(nextStep);
    setError("");
    setCode("");
  }

  function goBack() {
    setError("");
    if (!gate) {
      onClose();
      return;
    }
    if (door === "mentor" && step === "signin") {
      setDoor("app");
      setCode("");
      return;
    }
    setStep("signin");
  }

  function resetForm() {
    setSignupId("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setCode("");
    setError("");
    setStep("details");
  }

  const title =
    step === "signin"
      ? "Log in"
      : step === "details" && gate
        ? "Sign up"
        : step === "key"
          ? "License key"
          : step === "approved"
            ? "Approved"
            : step === "declined"
              ? "Declined"
              : step === "waiting"
                ? "Waiting"
                : "Activate";
  const holder = signup?.holder || signup?.name || `${firstName} ${lastName}`.trim();

  return (
    <section className="portal login-page" aria-labelledby="login-title">
      <header className="page-head">
        <div>
          <p className="eyebrow">{door === "mentor" ? "Mentor" : door === "app" ? "App" : "edgeX"}</p>
          <h2 id="login-title" onClick={onSecretTap}>
            {title}
          </h2>
        </div>
        {!(gate && door === "app" && step === "signin") && (
          <button type="button" className="text-btn" onClick={goBack}>
            Back
          </button>
        )}
      </header>
      <img className="login-logo" src="/edgex-logo.png" alt="" />
      {step === "signin" && door === "mentor" && (
        <form className="portal-form" onSubmit={signIn}>
          <p className="setting-copy">Sign in with the email from your mentor signup.</p>
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
            Log in
          </button>
          {gate && (
            <div className="auth-switch">
              <button type="button" className="text-btn" onClick={() => openPage("mentor", "details")}>
                Sign up
              </button>
              <button type="button" className="text-btn" onClick={() => openPage("app", "signin")}>
                App log in
              </button>
            </div>
          )}
        </form>
      )}
      {step === "signin" && door !== "mentor" && (
        <form className="portal-form" onSubmit={signIn}>
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
            Log in
          </button>
          {gate && (
            <div className="auth-switch">
              <button type="button" className="text-btn" onClick={() => openPage("app", "details")}>
                Sign up
              </button>
              <button type="button" className="text-btn" onClick={() => openPage("mentor", "signin")}>
                Mentor log in
              </button>
            </div>
          )}
        </form>
      )}
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
          {door === "mentor" && (
            <>
              <p className="portal-label">Market</p>
              <div className="choice-row">
                {MENTOR_MARKETS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={market === item ? "choice on" : "choice"}
                    aria-pressed={market === item}
                    onClick={() => setMarket(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="connect-btn">
            {gate ? "Sign up" : "Activate"}
          </button>
          {gate && (
            <div className="auth-switch">
              <button type="button" className="text-btn" onClick={() => openPage(door, "signin")}>
                Log in
              </button>
            </div>
          )}
        </form>
      )}
      {step === "waiting" && (
        <div className="portal-form">
          <p className="setting-title">{holder}</p>
          <p className="setting-copy">
            {door === "mentor"
              ? "This signup is on the mentor portal. An admin has to approve it before you can sign in."
              : "This signup is on Subscriptions. An admin has to approve it before you can enter a license key."}
          </p>
        </div>
      )}
      {step === "approved" && (
        <div className="portal-form">
          <p className="setting-title">{holder}</p>
          <p className="setting-copy">This mentor signup is approved. Sign in to open the mentor portal.</p>
          <button type="button" className="connect-btn" onClick={() => openPage("mentor", "signin")}>
            Log in
          </button>
        </div>
      )}
      {step === "declined" && (
        <div className="portal-form">
          <p className="setting-copy">
            {door === "mentor" ? "This mentor signup was declined." : "This signup was declined."}
          </p>
          <button type="button" className="connect-btn" onClick={resetForm}>
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
