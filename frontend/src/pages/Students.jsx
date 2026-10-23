import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import Icon from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { Avatar, DEPARTMENTS, EMAIL_RE, EmptyState, Field, PHONE_RE, PageHeader, Spinner } from "../components/ui.jsx";

const EMPTY = { name: "", email: "", phone: "", department: "", course: "" };

function StudentForm({ student, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(student ? { ...EMPTY, ...student, course: student.course || "" } : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Enter the student's full name";
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email address";
    if (!PHONE_RE.test(form.phone.trim())) errs.phone = "Enter a valid phone number (7-20 digits)";
    if (form.department.trim().length < 2) errs.department = "Choose or type a department";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      course: form.course.trim() || null,
    };
    setBusy(true);
    try {
      if (student) await api.students.update(student.id, payload);
      else await api.students.create(payload);
      toast(student ? "Student updated" : "Student added");
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
      title={student ? "Edit student" : "Add student"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button form="student-form" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving..." : student ? "Save changes" : "Add student"}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} noValidate>
        {formError && <div className="banner banner-error">{formError}</div>}
        <Field label="Full name" error={errors.name}>
          <input value={form.name} onChange={set("name")} placeholder="Aarav Mehta" autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Email" error={errors.email}>
            <input type="email" value={form.email} onChange={set("email")} placeholder="aarav@college.edu" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Department" error={errors.department}>
            <input list="dept-list" value={form.department} onChange={set("department")} placeholder="Computer Science" />
            <datalist id="dept-list">
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label="Course / program" error={errors.course} hint="Optional, e.g. B.Tech">
            <input value={form.course} onChange={set("course")} placeholder="B.Tech" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function StudentView({ student, onClose }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.students
      .courses(student.id)
      .then(setCourses)
      .catch((e) => setError(e.message));
  }, [student.id]);

  return (
    <Modal title="Student details" onClose={onClose}>
      <div className="profile">
        <Avatar name={student.name} size={56} />
        <div>
          <h3>{student.name}</h3>
          <span className="tag">{student.department}</span>
        </div>
      </div>
      <dl className="details">
        <dt><Icon name="mail" size={15} /> Email</dt>
        <dd>{student.email}</dd>
        <dt><Icon name="phone" size={15} /> Phone</dt>
        <dd>{student.phone}</dd>
        <dt><Icon name="courses" size={15} /> Program</dt>
        <dd>{student.course || "Not set"}</dd>
      </dl>
      <h4 className="subhead">Enrolled courses</h4>
      {error && <div className="banner banner-error">{error}</div>}
      {!error && courses === null && <Spinner />}
      {courses && courses.length === 0 && <p className="muted">Not enrolled in any course yet. Assign courses from a course page.</p>}
      {courses && courses.length > 0 && (
        <ul className="course-pills">
          {courses.map((c) => (
            <li key={c.id}>
              <span className="code">{c.code}</span> {c.title}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function Students() {
  const toast = useToast();
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [modal, setModal] = useState(null); // {type: 'form'|'view'|'delete', student?}
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.students
      .list({ q: search.trim(), department: dept })
      .then((data) => {
        setStudents(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [search, dept]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing
    return () => clearTimeout(t);
  }, [load]);

  const departments = Array.from(new Set([...DEPARTMENTS, ...(students || []).map((s) => s.department)])).sort();

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.students.remove(modal.student.id);
      toast("Student deleted");
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
        title="Students"
        subtitle="Everyone enrolled at your institution."
        action={
          <button className="btn btn-primary" onClick={() => setModal({ type: "form" })}>
            <Icon name="plus" size={16} /> Add student
          </button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
        </div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {!error && students === null && <Spinner />}

      {students && students.length === 0 && (
        <EmptyState
          title={search || dept ? "No students match your filters" : "No students yet"}
          text={search || dept ? "Try a different search or clear the department filter." : "Add your first student to get started."}
          action={
            !search && !dept && (
              <button className="btn btn-primary" onClick={() => setModal({ type: "form" })}>
                <Icon name="plus" size={16} /> Add student
              </button>
            )
          }
        />
      )}

      {students && students.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Program</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="who">
                      <Avatar name={s.name} />
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{s.phone}</td>
                  <td>
                    <span className="tag">{s.department}</span>
                  </td>
                  <td>{s.course || <span className="muted">-</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title="View" aria-label={`View ${s.name}`} onClick={() => setModal({ type: "view", student: s })}>
                        <Icon name="eye" />
                      </button>
                      <button className="icon-btn" title="Edit" aria-label={`Edit ${s.name}`} onClick={() => setModal({ type: "form", student: s })}>
                        <Icon name="edit" />
                      </button>
                      <button className="icon-btn danger" title="Delete" aria-label={`Delete ${s.name}`} onClick={() => setModal({ type: "delete", student: s })}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === "form" && (
        <StudentForm
          student={modal.student}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.type === "view" && <StudentView student={modal.student} onClose={() => setModal(null)} />}
      {modal?.type === "delete" && (
        <Modal
          title="Delete student"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete student"}
              </button>
            </>
          }
        >
          <p>
            Delete <strong>{modal.student.name}</strong>? Their record and course enrollments will be removed. This can't be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
