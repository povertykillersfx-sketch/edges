import { useEffect, useRef, useState } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from "./admin.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function compact(value) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function cleanPassword(value) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

async function hashPassword(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cleanPassword(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resumeDesk(subscriptions) {
  const pending = (subscriptions ?? []).find((item) => item.status === "pending");
  if (pending) return pending;
  return (subscriptions ?? []).find((item) => item.status === "approved" && !item.keyId) ?? null;
}

function approvedDesk(subscriptions) {
  return (subscriptions ?? []).find((item) => item.status === "approved" && !item.keyId) ?? null;
}

function gateStart(subscriptions) {
  if (approvedDesk(subscriptions)) return "signin";
  if ((subscriptions ?? []).some((item) => item.status === "pending")) return "waiting";
  return "details";
}

function AppSteps({ current }) {
  const items = ["Sign up", "Approval", "License"];
  return (
    <ol className="auth-steps" aria-label="Activation">
      {items.map((label, index) => (
        <li key={label} className={index === current ? "on" : index < current ? "done" : ""}>
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function Login({
  subscriptions,
  mentors,
  keys,
  gate,
  onClose,
  onSignup,
  onMentorSignup,
  onResetMentorPassword,
  onActivate,
  onSignIn,
  onCheckPaid,
  onSecretTap,
  onLogoTap,
  entry = "app",
}) {
  const open = gate ? approvedDesk(subscriptions) ?? resumeDesk(subscriptions) : resumeDesk(subscriptions);
  const mentorEntry = entry === "mentor";
  const [door, setDoor] = useState(mentorEntry ? "mentor" : "app");
  const [step, setStep] = useState(() => {
    if (mentorEntry) return "signin";
    if (gate) return gateStart(subscriptions);
    if (!open) return "details";
    if (open.status === "approved") return "key";
    return "waiting";
  });
  const [signupId, setSignupId] = useState(open?.id ?? "");
  const [firstName, setFirstName] = useState(open?.firstName ?? "");
  const [lastName, setLastName] = useState(open?.lastName ?? "");
  const [email, setEmail] = useState(mentorEntry ? "" : (open?.email ?? ""));
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const emailRef = useRef(null);
  const licenseOpen = useRef(false);
  const signup =
    door === "mentor"
      ? (mentors ?? []).find((item) => item.id === signupId) ?? null
      : (subscriptions ?? []).find((item) => item.id === signupId) ?? null;

  useEffect(() => {
    if (door !== "mentor") return undefined;
    const wipe = () => {
      const node = emailRef.current;
      if (!node || document.activeElement === node) return;
      if (node.value && email === "") node.value = "";
    };
    const timers = [0, 80, 400, 1000].map((delay) => setTimeout(wipe, delay));
    return () => timers.forEach(clearTimeout);
  }, [door, step, email]);

  useEffect(() => {
    if (!signup || door === "mentor") {
      if (signup?.status === "approved" && step === "waiting") setStep("approved");
      if (signup?.status === "declined" && step === "waiting") setStep("declined");
      return;
    }
    const cleared = signup.status === "approved" || signup.status === "active";
    if (cleared && step === "waiting") {
      licenseOpen.current = true;
      setStep("key");
      return;
    }
    if (signup.status === "declined" && step === "waiting") setStep("declined");
    if ((step === "signin" || step === "key") && !cleared && !licenseOpen.current) setStep("details");
  }, [signup, step, door]);

  async function continueDetails(event) {
    event.preventDefault();
    const address = email.trim();
    if (door === "mentor") {
      const name = fullName.trim();
      const shown = displayName.trim();
      const digits = phone.replace(/\D/g, "");
      if (!name || !shown || !EMAIL.test(address) || digits.length < 6 || password.length < 6) {
        setError("Enter your name, display name, email, contact number, and a password.");
        return;
      }
      const existing = (mentors ?? []).find(
        (item) => item.email.toLowerCase() === address.toLowerCase() && item.status === "pending"
      );
      if (existing) {
        setSignupId(existing.id);
        setPassword("");
        setStep("waiting");
        setError("");
        return;
      }
      const created = onMentorSignup({
        fullName: name,
        displayName: shown,
        email: address,
        phone: phone.trim(),
        instagram: instagram.trim(),
        passwordHash: await hashPassword(password),
      });
      setSignupId(created.id);
      setPassword("");
      setError("");
      setStep(created.status === "approved" ? "approved" : "waiting");
      return;
    }
    const name = firstName.trim();
    const surname = lastName.trim();
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

  async function signIn(event) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter your email address.");
      return;
    }
    if (door === "mentor") {
      if (address.toLowerCase() === ADMIN_EMAIL) {
        if (cleanPassword(password).length < 6) {
          setError("Enter your password.");
          return;
        }
        if ((await hashPassword(password)) !== ADMIN_PASSWORD_HASH) {
          setError("That password does not match.");
          return;
        }
        setPassword("");
        onSignIn({ role: "admin", email: address });
        return;
      }
      const mentor = (mentors ?? []).find((item) => item.email.toLowerCase() === address.toLowerCase());
      if (!mentor) {
        setError("That mentor account was not found.");
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
      if (cleanPassword(password).length < 6) {
        setError("Enter your password.");
        return;
      }
      if (!mentor.passwordHash || mentor.passwordHash !== (await hashPassword(password))) {
        setError("That password does not match.");
        return;
      }
      setPassword("");
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

  async function resetPassword(event) {
    event.preventDefault();
    const address = email.trim();
    const mentor = (mentors ?? []).find((item) => item.email.toLowerCase() === address.toLowerCase());
    if (!EMAIL.test(address) || !mentor) {
      setError("That mentor account was not found.");
      return;
    }
    if (mentor.status !== "approved") {
      setError("Wait for an admin to approve this signup.");
      return;
    }
    if (cleanPassword(password).length < 6) {
      setError("Enter a new password.");
      return;
    }
    onResetMentorPassword({ email: address, passwordHash: await hashPassword(password) });
    setPassword("");
    setError("");
    setStep("signin");
  }

  function openPage(nextDoor, nextStep) {
    setDoor(nextDoor);
    setStep(nextStep);
    setError("");
    setCode("");
    setPassword("");
  }

  async function confirmPaid() {
    setError("");
    setChecking(true);
    try {
      const latest = await onCheckPaid?.({ id: signup?.id || signupId, email: signup?.email || email });
      if (latest?.status === "declined") {
        if (latest.id) setSignupId(latest.id);
        setStep("declined");
        return;
      }
      if (latest?.status === "approved" || latest?.status === "active") {
        if (latest.id) setSignupId(latest.id);
        licenseOpen.current = true;
        setStep("key");
        return;
      }
      setError("This signup is not approved yet.");
    } catch {
      setError("The desk did not respond. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function goBack() {
    licenseOpen.current = false;
    setError("");
    if (!gate) {
      onClose();
      return;
    }
    if (door === "mentor" && step === "signin") {
      setDoor("app");
      setCode("");
      setStep("details");
      return;
    }
    if (door === "app" && step !== "details") {
      setCode("");
      setStep("details");
      return;
    }
    setStep("details");
  }

  function resetForm() {
    setSignupId("");
    setFirstName("");
    setLastName("");
    setFullName("");
    setDisplayName("");
    setPhone("");
    setInstagram("");
    setPassword("");
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
  const mentorScreen =
    door === "mentor" && ["signin", "details", "reset", "waiting", "approved", "declined"].includes(step);
  const appScreen =
    door !== "mentor" && ["signin", "details", "waiting", "declined", "key"].includes(step);
  const holder = signup?.displayName || signup?.holder || signup?.name || `${firstName} ${lastName}`.trim();
  const appStep = step === "key" || step === "signin" ? 2 : step === "details" ? 0 : 1;
  const appBack =
    gate && step === "details" ? null : (
      <button type="button" className="auth-back" onClick={goBack}>
        Back
      </button>
    );

  return (
    <section
      className={`portal login-page${mentorScreen || appScreen ? " mentor-auth" : ""}`}
      aria-labelledby="login-title"
    >
      {!mentorScreen && !appScreen && (
        <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{door === "mentor" ? "Mentor" : door === "app" ? "App" : "edgeX"}</p>
          <h2 id="login-title" onClick={onSecretTap}>
            {title}
          </h2>
        </div>
        {!(gate && door === "app" && step === "details") && (
          <button type="button" className="text-btn" onClick={goBack}>
            Back
          </button>
        )}
      </header>
      <img className="login-logo" src="/edgex-logo.png" alt="" onClick={onLogoTap} />
        </>
      )}
      {step === "signin" && door === "mentor" && (
        <form className="auth-card" autoComplete="off" onSubmit={signIn}>
          <div className="auth-mark">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <h2 id="login-title" onClick={onSecretTap}>
            edgeX
          </h2>
          <p className="auth-kicker">Mentor portal</p>
          <p className="auth-heading">Sign in</p>
          <input
            ref={emailRef}
            type="text"
            inputMode="email"
            name="mentor-address"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="Email address"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            type="password"
            name="mentor-secret"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Password"
            autoComplete="off"
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="auth-submit">
            Sign in
          </button>
          <button type="button" className="auth-quiet" onClick={() => openPage("mentor", "reset")}>
            Forgot password?
          </button>
          <p className="auth-foot">
            Don't have an account?{" "}
            <button type="button" onClick={() => openPage("mentor", "details")}>
              Create account
            </button>
          </p>
        </form>
      )}
      {step === "signin" && door !== "mentor" && (
        <form className="auth-card" onSubmit={signIn}>
          <div className="auth-mark">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <p className="auth-kicker">App</p>
          <h2 id="login-title" onClick={onSecretTap}>
            Log in
          </h2>
          <AppSteps current={appStep} />
          <label>
            Email
            <input
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
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
          <button type="submit" className="auth-submit">
            Log in
          </button>
          {gate && (
            <p className="auth-foot">
              <button type="button" onClick={() => openPage("app", "details")}>
                Sign up
              </button>
            </p>
          )}
          {appBack}
        </form>
      )}
      {step === "details" && door === "mentor" && (
        <form className="auth-card" onSubmit={continueDetails}>
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <h2 id="login-title" onClick={onSecretTap}>
            Mentor sign up
          </h2>
          <p className="auth-sub">Create your account</p>
          <input
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setError("");
            }}
            placeholder="Full name"
            autoComplete="name"
          />
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError("");
            }}
            placeholder="Display name"
          />
          <input
            ref={emailRef}
            type="text"
            inputMode="email"
            name="mentor-signup-address"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="Email"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setError("");
            }}
            placeholder="Contact number"
            inputMode="tel"
            autoComplete="tel"
          />
          <input
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
            placeholder="Instagram link (optional)"
            autoComplete="off"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="Password"
            autoComplete="new-password"
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="auth-submit">
            Register
          </button>
          <p className="auth-foot">
            Already have an account?{" "}
            <button type="button" onClick={() => openPage("mentor", "signin")}>
              Sign in
            </button>
          </p>
        </form>
      )}
      {step === "reset" && door === "mentor" && (
        <form className="auth-card" onSubmit={resetPassword}>
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <h2 id="login-title" onClick={onSecretTap}>
            Reset password
          </h2>
          <p className="auth-kicker">Mentor portal</p>
          <input
            ref={emailRef}
            type="text"
            inputMode="email"
            name="mentor-reset-address"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            placeholder="Email address"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="New password"
            autoComplete="new-password"
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="auth-submit">
            Save password
          </button>
          <p className="auth-foot">
            <button type="button" onClick={() => openPage("mentor", "signin")}>
              Sign in
            </button>
          </p>
        </form>
      )}
      {step === "details" && door !== "mentor" && (
        <form className="auth-card" onSubmit={continueDetails}>
          <div className="auth-mark">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <p className="auth-kicker">App</p>
          <h2 id="login-title" onClick={onSecretTap}>
            {title}
          </h2>
          <AppSteps current={appStep} />
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
          <button type="submit" className="auth-submit">
            {gate ? "Activate app" : "Activate"}
          </button>
          {appBack}
        </form>
      )}
      {step === "waiting" && door === "mentor" && (
        <div className="auth-card">
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <h2 id="login-title" onClick={onSecretTap}>
            Mentor sign up
          </h2>
          <p className="auth-heading">{holder}</p>
          <p className="auth-sub">An admin has to approve this account before you can sign in.</p>
        </div>
      )}
      {step === "waiting" && door !== "mentor" && (
        <div className="auth-card">
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <p className="auth-kicker">App</p>
          <h2 id="login-title" onClick={onSecretTap}>
            Waiting
          </h2>
          <AppSteps current={appStep} />
          <p className="auth-heading">{holder}</p>
          <p className="auth-sub">
            This signup is on Subscriptions. An admin has to approve it before you can enter a license key.
          </p>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="auth-submit" onClick={confirmPaid} disabled={checking}>
            {checking ? "Checking" : "I've paid"}
          </button>
          {appBack}
        </div>
      )}
      {step === "approved" && (
        <div className="auth-card">
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <h2 id="login-title" onClick={onSecretTap}>
            Approved
          </h2>
          <p className="auth-heading">{holder}</p>
          <p className="auth-sub">This mentor account is approved. Sign in to open the mentor portal.</p>
          <button type="button" className="auth-submit" onClick={() => openPage("mentor", "signin")}>
            Sign in
          </button>
        </div>
      )}
      {step === "declined" && door === "mentor" && (
        <div className="auth-card">
          <h2 id="login-title" onClick={onSecretTap}>
            Declined
          </h2>
          <p className="auth-sub">This mentor signup was declined.</p>
          <button type="button" className="auth-submit" onClick={resetForm}>
            Sign up again
          </button>
        </div>
      )}
      {step === "declined" && door !== "mentor" && (
        <div className="auth-card">
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <p className="auth-kicker">App</p>
          <h2 id="login-title" onClick={onSecretTap}>
            Declined
          </h2>
          <AppSteps current={appStep} />
          <p className="auth-sub">This signup was declined.</p>
          <button type="button" className="auth-submit" onClick={resetForm}>
            Sign up again
          </button>
          {appBack}
        </div>
      )}
      {step === "key" && (
        <form className="auth-card" onSubmit={submitKey}>
          <div className="auth-mark small">
            <img src="/edgex-logo.png" alt="" onClick={onLogoTap} />
          </div>
          <p className="auth-kicker">App</p>
          <h2 id="login-title" onClick={onSecretTap}>
            License key
          </h2>
          <AppSteps current={appStep} />
          <p className="auth-sub">Approved. Enter the license key for {signup?.email || email}.</p>
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
          <button type="submit" className="auth-submit">
            Activate
          </button>
          {appBack}
        </form>
      )}
    </section>
  );
}
