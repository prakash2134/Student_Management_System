import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import AuthShell from "../components/AuthShell.jsx";
import { EMAIL_RE, Field } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.full_name.trim().length < 2) errs.full_name = "Enter your full name";
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email address";
    if (form.password.length < 6) errs.password = "Use at least 6 characters";
    if (form.confirm !== form.password) errs.confirm = "Passwords don't match";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await api.register({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      await login(form.email.trim(), form.password);
      toast("Account created. You're in!");
      navigate("/");
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already registered? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {formError && <div className="banner banner-error">{formError}</div>}
        <Field label="Full name" error={errors.full_name}>
          <input value={form.full_name} onChange={set("full_name")} placeholder="Priya Sharma" autoComplete="name" autoFocus />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@college.edu" autoComplete="email" />
        </Field>
        <div className="grid-2">
          <Field label="Password" error={errors.password}>
            <input type="password" value={form.password} onChange={set("password")} placeholder="6+ characters" autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat it" autoComplete="new-password" />
          </Field>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
