const AVATAR_COLORS = [
  ["#E3E6FF", "#3D4EF0"],
  ["#D6F5EE", "#0E8E78"],
  ["#FFEFC9", "#A56A00"],
  ["#FFE0E0", "#C23B3B"],
  ["#EADDFB", "#6B3FC4"],
];

function hash(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name = "", size = 38 }) {
  const [bg, fg] = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}>
      {initials || "?"}
    </span>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        <i /> <i /> <i />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" role="progressbar" aria-label="Loading" />;
}

export const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Business",
  "Mathematics",
  "Physics",
  "Design",
];

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
