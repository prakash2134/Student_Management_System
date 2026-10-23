import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Icon from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { EmptyState, Field, PageHeader, Spinner } from "../components/ui.jsx";

const BANDS = ["#3D4EF0", "#1FB59A", "#F4B63F", "#EF5B5B", "#7B4FD6"];
export const bandFor = (id) => BANDS[id % BANDS.length];

export function CourseForm({ course, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(
    course
      ? { code: course.code, title: course.title, description: course.description || "", instructor: course.instructor || "", credits: course.credits }
      : { code: "", title: "", description: "", instructor: "", credits: 3 }
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.code.trim().length < 2) errs.code = "Enter a course code, e.g. CS101";
    if (form.title.trim().length < 2) errs.title = "Enter a course title";
    const credits = Number(form.credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 10) errs.credits = "Credits must be between 1 and 10";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      instructor: form.instructor.trim() || null,
      credits,
    };
    setBusy(true);
    try {
      if (course) await api.courses.update(course.id, payload);
      else await api.courses.create(payload);
      toast(course ? "Course updated" : "Course created");
      onSaved();
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={course ? "Edit course" : "New course"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button form="course-form" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving..." : course ? "Save changes" : "Create course"}
          </button>
        </>
      }
    >
      <form id="course-form" onSubmit={submit} noValidate>
        {formError && <div className="banner banner-error">{formError}</div>}
        <div className="grid-2 grid-code">
          <Field label="Code" error={errors.code}>
            <input value={form.code} onChange={set("code")} placeholder="CS101" autoFocus />
          </Field>
          <Field label="Title" error={errors.title}>
            <input value={form.title} onChange={set("title")} placeholder="Introduction to Programming" />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Instructor" error={errors.instructor}>
            <input value={form.instructor} onChange={set("instructor")} placeholder="Dr. Rao" />
          </Field>
          <Field label="Credits" error={errors.credits}>
            <input type="number" min="1" max="10" value={form.credits} onChange={set("credits")} />
          </Field>
        </div>
        <Field label="Description" error={errors.description}>
          <textarea rows="3" value={form.description} onChange={set("description")} placeholder="What will students learn?" />
        </Field>
      </form>
    </Modal>
  );
}

export default function Courses() {
  const toast = useToast();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.courses
      .list()
      .then((d) => {
        setCourses(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.courses.remove(modal.course.id);
      toast("Course deleted");
      setModal(null);
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Courses"
        subtitle="Your catalogue. Open a course to enroll students."
        action={
          <button className="btn btn-primary" onClick={() => setModal({ type: "form" })}>
            <Icon name="plus" size={16} /> New course
          </button>
        }
      />

      {error && <div className="banner banner-error">{error}</div>}
      {!error && courses === null && <Spinner />}
      {courses && courses.length === 0 && (
        <EmptyState
          title="No courses yet"
          text="Create your first course, then enroll students in it."
          action={
            <button className="btn btn-primary" onClick={() => setModal({ type: "form" })}>
              <Icon name="plus" size={16} /> New course
            </button>
          }
        />
      )}

      {courses && courses.length > 0 && (
        <div className="course-grid">
          {courses.map((c) => (
            <article key={c.id} className="course-card">
              <div className="course-band" style={{ background: bandFor(c.id) }}>
                <span>{c.code}</span>
                <small>{c.credits} credit{c.credits === 1 ? "" : "s"}</small>
              </div>
              <div className="course-body">
                <h3>
                  <Link to={`/courses/${c.id}`}>{c.title}</Link>
                </h3>
                <p>{c.description || "No description yet."}</p>
                <div className="course-meta">
                  <span>{c.instructor || "No instructor assigned"}</span>
                  <b>{c.enrolled_count} enrolled</b>
                </div>
              </div>
              <div className="course-actions">
                <Link className="btn btn-soft" to={`/courses/${c.id}`}>
                  Open
                </Link>
                <button className="icon-btn" title="Edit" aria-label={`Edit ${c.title}`} onClick={() => setModal({ type: "form", course: c })}>
                  <Icon name="edit" />
                </button>
                <button className="icon-btn danger" title="Delete" aria-label={`Delete ${c.title}`} onClick={() => setModal({ type: "delete", course: c })}>
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal?.type === "form" && (
        <CourseForm
          course={modal.course}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "delete" && (
        <Modal
          title="Delete course"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete course"}
              </button>
            </>
          }
        >
          <p>
            Delete <strong>{modal.course.code} {modal.course.title}</strong>? All {modal.course.enrolled_count} enrollment(s) will be removed too.
          </p>
        </Modal>
      )}
    </>
  );
}
