import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import Icon from "../components/Icons.jsx";
import { useToast } from "../components/Toast.jsx";
import { Avatar, EmptyState, Spinner } from "../components/ui.jsx";
import { CourseForm, bandFor } from "./Courses.jsx";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, e, s] = await Promise.all([api.courses.get(id), api.courses.students(id), api.students.list()]);
      setCourse(c);
      setEnrolled(e);
      setAllStudents(s);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const enrolledIds = new Set(enrolled.map((e) => e.student_id));
  const available = allStudents.filter((s) => !enrolledIds.has(s.id));

  const enroll = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      await api.courses.enroll(id, Number(pick));
      toast("Student enrolled");
      setPick("");
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (studentId) => {
    try {
      await api.courses.unenroll(id, studentId);
      toast("Student removed from course");
      await load();
    } catch (err) {
      toast(err.message, "error");
    }
  };

  if (error)
    return (
      <>
        <div className="banner banner-error">{error}</div>
        <Link className="btn btn-ghost" to="/courses">
          <Icon name="back" size={16} /> Back to courses
        </Link>
      </>
    );
  if (!course) return <Spinner />;

  return (
    <>
      <Link className="back" to="/courses">
        <Icon name="back" size={16} /> All courses
      </Link>

      <section className="course-hero" style={{ background: bandFor(course.id) }}>
        <div>
          <span className="hero-code">{course.code}</span>
          <h1>{course.title}</h1>
          <p>{course.description || "No description yet."}</p>
        </div>
        <div className="hero-side">
          <div>
            <small>Instructor</small>
            <strong>{course.instructor || "Not assigned"}</strong>
          </div>
          <div>
            <small>Credits</small>
            <strong>{course.credits}</strong>
          </div>
          <div>
            <small>Enrolled</small>
            <strong>{course.enrolled_count}</strong>
          </div>
          <button className="btn btn-light" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> Edit course
          </button>
        </div>
      </section>

      <section className="panel enroll-panel">
        <h2>Enroll a student</h2>
        <div className="enroll-row">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Select a student to enroll">
            <option value="">{available.length ? "Choose a student" : "Every student is already enrolled"}</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.department})
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={enroll} disabled={!pick || busy}>
            {busy ? "Enrolling..." : "Enroll student"}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Enrolled students ({enrolled.length})</h2>
        {enrolled.length === 0 ? (
          <EmptyState title="Nobody enrolled yet" text="Pick a student above to add them to this course." />
        ) : (
          <ul className="people">
            {enrolled.map((e) => (
              <li key={e.student_id}>
                <Avatar name={e.student?.name || "?"} />
                <div>
                  <strong>{e.student?.name || `Student #${e.student_id}`}</strong>
                  <span>{e.student?.email || "Details unavailable"}</span>
                </div>
                {e.student && <span className="tag">{e.student.department}</span>}
                <button className="btn btn-ghost btn-sm" onClick={() => remove(e.student_id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <CourseForm
          course={course}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </>
  );
}
