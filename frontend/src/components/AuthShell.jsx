export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <div className="auth-brand">
          <span className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M5 12l11-5 11 5-11 5z" fill="#fff" />
              <path d="M10 16v5c3 2.6 9 2.6 12 0v-5l-6 2.6z" fill="#F4B63F" />
            </svg>
          </span>
          <span>Campusly</span>
        </div>
        <div className="auth-copy">
          <h2>Every student and every course, in one place.</h2>
          <p>Register students, build your course catalogue and see who is enrolled where.</p>
        </div>
        <div className="auth-chips" aria-hidden="true">
          <span className="chip c1">CS101 · Intro to Programming</span>
          <span className="chip c2">48 students enrolled</span>
          <span className="chip c3">MA204 · Linear Algebra</span>
          <span className="chip c4">Design Studio II</span>
        </div>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <h1>{title}</h1>
          <p className="auth-sub">{subtitle}</p>
          {children}
          <p className="auth-foot">{footer}</p>
        </div>
      </section>
    </div>
  );
}
