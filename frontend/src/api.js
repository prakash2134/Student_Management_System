const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "campusly_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Turns FastAPI's error payloads into a friendly message plus per-field messages.
function parseError(status, body) {
  const detail = body && body.detail;
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    detail.forEach((item) => {
      const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : "form";
      const msg = String(item.msg || "Invalid value").replace(/^Value error, /, "");
      if (!fieldErrors[field]) fieldErrors[field] = msg;
    });
    return new ApiError("Please fix the highlighted fields.", status, fieldErrors);
  }
  if (typeof detail === "string") return new ApiError(detail, status);
  return new ApiError("Something went wrong. Please try again.", status);
}

async function request(method, path, body) {
  const headers = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that the API gateway is running.", 0);
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("campusly:unauthorized"));
    throw parseError(res.status, data);
  }
  return data;
}

export const api = {
  register: (data) => request("POST", "/auth/register", data),
  login: (data) => request("POST", "/auth/login", data),
  me: () => request("GET", "/auth/me"),

  students: {
    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request("GET", `/students${qs ? `?${qs}` : ""}`);
    },
    get: (id) => request("GET", `/students/${id}`),
    create: (data) => request("POST", "/students", data),
    update: (id, data) => request("PUT", `/students/${id}`, data),
    remove: (id) => request("DELETE", `/students/${id}`),
    courses: (id) => request("GET", `/students/${id}/courses`),
  },

  courses: {
    list: () => request("GET", "/courses"),
    get: (id) => request("GET", `/courses/${id}`),
    create: (data) => request("POST", "/courses", data),
    update: (id, data) => request("PUT", `/courses/${id}`, data),
    remove: (id) => request("DELETE", `/courses/${id}`),
    students: (id) => request("GET", `/courses/${id}/students`),
    enroll: (id, studentId) => request("POST", `/courses/${id}/students`, { student_id: studentId }),
    unenroll: (id, studentId) => request("DELETE", `/courses/${id}/students/${studentId}`),
  },
};
