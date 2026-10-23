import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Avatar, EmptyState, PageHeader, Spinner } from "../components/ui.jsx";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.students.list(), api.courses.list()])
      .then(([s, c]) => {
        setStudents(s);
        setCourses(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    if (!students || !courses) return null;
    const byDept = {};
    students.forEach((s) => (byDept[s.department] = (byDept[s.department] || 0) + 1));
    const depts = Object.entries(byDept).sort((a, b) => b[1] - a[1]);
    const enrollments = courses.reduce((sum, c) => sum + c.enrolled_count, 0);
    const popular = [...courses].sort((a, b) => b.enrolled_count - a.enrolled_count).slice(0, 5);
    return { depts, enrollments, popular, recent: students.slice(0, 5) };
  }, [students, courses]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!stats) return <Spinner />;

  const maxDept = Math.max(1, ...stats.depts.map((d) => d[1]));
  const maxEnrolled = Math.max(1, ...stats.popular.map((c) => c.enrolled_count));

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.full_name.split(" ")[0]}`} subtitle="Here's where your campus stands today." />

      <section className="stats">
        <Link to="/students" className="stat stat-hero">
          <span className="stat-label">Total students</span>
          <strong className="stat-num">{students.length}</strong>
          <span className="stat-note">across {stats.depts.length} department{stats.depts.length === 1 ? "" : "s"}</span>
        </Link>
        <Link to="/courses" className="stat">
          <span className="stat-label">Available courses</span>
          <strong className="stat-num">{courses.length}</strong>
        </Link>
        <div className="stat">
          <span className="stat-label">Enrollments</span>
          <strong className="stat-num">{stats.enrollments}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Avg. per course</span>
          <strong className="stat-num">{courses.length ? (stats.enrollments / courses.length).toFixed(1) : "0"}</strong>
        </div>
      </section>

      <section className="panels">
        <div className="panel">
          <h2>Students by department</h2>
          {stats.depts.length === 0 ? (
            <p className="muted">No students yet. Add your first student to see this chart.</p>
          ) : (
            <ul className="bars">
              {stats.depts.map(([name, count]) => (
                <li key={name}>
                  <div className="bar-row">
                    <span>{name}</span>
                    <b>{count}</b>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(count / maxDept) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h2>Most popular courses</h2>
          {stats.popular.length === 0 ? (
            <p className="muted">No courses yet. Create a course to start enrolling students.</p>
          ) : (
            <ul className="bars">
              {stats.popular.map((c) => (
                <li key={c.id}>
                  <div className="bar-row">
                    <Link to={`/courses/${c.id}`}>
                      <span className="code">{c.code}</span> {c.title}
                    </Link>
                    <b>{c.enrolled_count}</b>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill alt" style={{ width: `${(c.enrolled_count / maxEnrolled) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel panel-wide">
          <div className="panel-head">
            <h2>Recently added students</h2>
            <Link to="/students">View all</Link>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyState title="No students yet" text="Students you add will show up here." />
          ) : (
            <ul className="people">
              {stats.recent.map((s) => (
                <li key={s.id}>
                  <Avatar name={s.name} />
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.email}</span>
                  </div>
                  <span className="tag">{s.department}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
