import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import AuthShell from "../components/AuthShell.jsx";
import { EMAIL_RE, Field } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email address";
    if (!form.password) errs.password = "Enter your password";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      toast("Welcome back!");
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
      title="Welcome back"
      subtitle="Log in to manage your students and courses."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {formError && <div className="banner banner-error">{formError}</div>}
        <Field label="Email" error={errors.email}>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@college.edu" autoComplete="email" autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" value={form.password} onChange={set("password")} placeholder="Your password" autoComplete="current-password" />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
