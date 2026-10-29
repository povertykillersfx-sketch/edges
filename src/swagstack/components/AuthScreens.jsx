import { useState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "../lib/api.js";
import { validateEmail, validatePassword, sanitizeText } from "../lib/validation.js";
import { navigateStudio } from "../lib/path.js";

function AuthShell({ title, children, footer }) {
  return (
    <div className="ss-auth">
      <div className="ss-auth-panel">
        <p className="ss-brand-mark">SwagStack Studio</p>
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    </div>
  );
}

export function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const e = validateEmail(email);
    const p = validatePassword(password);
    if (!e.ok) return setError(e.error);
    if (!p.ok) return setError(p.error);
    setBusy(true);
    try {
      await signIn({ email: e.value, password: p.value });
      onSuccess?.();
      navigateStudio("/studio/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      footer={
        <p className="ss-auth-foot">
          New here? <button type="button" className="ss-linkish" onClick={() => navigateStudio("/studio/signup")}>Create an account</button>
        </p>
      }
    >
      <form className="ss-form" onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error ? <p className="ss-error">{error}</p> : null}
        <button className="ss-btn ss-btn-primary" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" className="ss-linkish" onClick={() => navigateStudio("/studio/reset")}>
          Reset password
        </button>
      </form>
    </AuthShell>
  );
}

export function SignupScreen({ onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    const e = validateEmail(email);
    const p = validatePassword(password);
    if (!e.ok) return setError(e.error);
    if (!p.ok) return setError(p.error);
    setBusy(true);
    try {
      const result = await signUp({
        email: e.value,
        password: p.value,
        fullName: sanitizeText(fullName, { max: 120 }),
      });
      if (result.session) {
        onSuccess?.();
        navigateStudio("/studio/dashboard", { replace: true });
      } else {
        setInfo("Check your email to confirm the account, then sign in. (Confirmation depends on your Supabase Auth settings.)");
      }
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      footer={
        <p className="ss-auth-foot">
          Already have an account? <button type="button" className="ss-linkish" onClick={() => navigateStudio("/studio/login")}>Sign in</button>
        </p>
      }
    >
      <form className="ss-form" onSubmit={submit}>
        <label>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" required />
        </label>
        {error ? <p className="ss-error">{error}</p> : null}
        {info ? <p className="ss-info">{info}</p> : null}
        <button className="ss-btn ss-btn-primary" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

export function ResetScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestReset(event) {
    event.preventDefault();
    setError("");
    const e = validateEmail(email);
    if (!e.ok) return setError(e.error);
    setBusy(true);
    try {
      await requestPasswordReset(e.value);
      setMessage("If that email exists, a reset link was sent. Open it, then set a new password here.");
      setMode("update");
    } catch (err) {
      setError(err.message || "Could not start reset.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError("");
    const p = validatePassword(password);
    if (!p.ok) return setError(p.error);
    setBusy(true);
    try {
      await updatePassword(p.value);
      setMessage("Password updated. You can sign in.");
      navigateStudio("/studio/login");
    } catch (err) {
      setError(err.message || "Could not update password. Open the email link first.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset password">
      {mode === "request" ? (
        <form className="ss-form" onSubmit={requestReset}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          {error ? <p className="ss-error">{error}</p> : null}
          {message ? <p className="ss-info">{message}</p> : null}
          <button className="ss-btn ss-btn-primary" disabled={busy} type="submit">
            Send reset link
          </button>
        </form>
      ) : (
        <form className="ss-form" onSubmit={savePassword}>
          <label>
            New password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error ? <p className="ss-error">{error}</p> : null}
          {message ? <p className="ss-info">{message}</p> : null}
          <button className="ss-btn ss-btn-primary" disabled={busy} type="submit">
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
