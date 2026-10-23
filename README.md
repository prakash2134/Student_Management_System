# Campusly: Student Management System (Microservices)

A full stack student management app built with a microservices backend (FastAPI + SQLite) and a React frontend. Users can register, log in, manage students and courses, and enroll students in courses.

## Architecture

```
 React (Vite)  :5173
      |
      v
 API Gateway   :8000   <- the only thing the frontend talks to
   |       |        |
   v       v        v
 Auth     Student   Course
 :8001    :8002     :8003
 auth.db  students.db  courses.db
```

| Component | Responsibility | Port | Database |
|---|---|---|---|
| `frontend` | React UI (login, dashboard, students, courses) | 5173 | none |
| `services/api-gateway` | Routes requests, centralises errors and CORS | 8000 | none |
| `services/auth-service` | Register, login, JWT issue and validation | 8001 | `auth.db` |
| `services/student-service` | Student CRUD | 8002 | `students.db` |
| `services/course-service` | Course CRUD and enrollments | 8003 | `courses.db` |

How the services work together:
- The auth service issues a JWT. The student and course services validate it with the shared `JWT_SECRET`, so every endpoint (except register/login) needs `Authorization: Bearer <token>`.
- The course service stores only a `student_id` for each enrollment. It asks the student service to confirm the student exists and to fetch names for the "students in a course" list.
- When a student is deleted, the student service asks the course service to remove that student's enrollments.
- The gateway returns clean JSON errors: `404` for unknown routes, `503` if a service is down, `504` on timeout.

## Folder structure

```
student-management-system/
  frontend/                 React app (Vite)
  services/
    api-gateway/app/        main.py, config.py
    auth-service/app/       main.py, models.py, schemas.py, security.py, database.py, config.py
    student-service/app/    (same layout)
    course-service/app/     (same layout)
  postman/                  Postman collection
  scripts/                  run_all.sh, run_all.bat, seed.py
```

## Prerequisites

Python 3.10+, Node.js 18+, and npm.

## Environment variables

Each service has a `.env.example`. Copy it to `.env` (the run scripts do this for you).

| Service | Variable | Purpose |
|---|---|---|
| auth, student, course | `JWT_SECRET` | Signing key. **Must be identical in all three.** Use a long random string. |
| auth | `JWT_EXPIRE_MINUTES` | Token lifetime (default 120) |
| auth, student, course | `DATABASE_URL` | SQLite file, e.g. `sqlite:///./auth.db` |
| student | `COURSE_SERVICE_URL` | Where to reach the course service |
| course | `STUDENT_SERVICE_URL` | Where to reach the student service |
| api-gateway | `AUTH_SERVICE_URL`, `STUDENT_SERVICE_URL`, `COURSE_SERVICE_URL` | Service addresses |
| api-gateway | `CORS_ORIGINS` | Allowed frontend origins (comma separated) |
| frontend | `VITE_API_BASE_URL` | Gateway URL (default `http://localhost:8000`) |

Generate a secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

## Quick start

**Windows:** `scripts\run_all.bat` (opens one window per service plus the frontend)

**macOS / Linux / Git Bash:** `./scripts/run_all.sh`

Then open http://localhost:5173 and create an account.

## Run each service manually

Open a terminal per service. Do this once per service folder first:

```bash
cd services/<service-name>
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
```

Then start them:

```bash
# services/auth-service
uvicorn app.main:app --port 8001 --reload
# services/student-service
uvicorn app.main:app --port 8002 --reload
# services/course-service
uvicorn app.main:app --port 8003 --reload
# services/api-gateway
uvicorn app.main:app --port 8000 --reload
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Database tables are created automatically on first start (SQLAlchemy `create_all` in each service's `main.py`, models in `models.py`).

## Demo data (optional)

With everything running: `python scripts/seed.py`. It creates demo students, courses and enrollments and the login `demo@campusly.dev` / `demo1234`. Useful for screenshots.

## API documentation (Swagger UI)

| Service | Swagger UI |
|---|---|
| API Gateway | http://localhost:8000/docs |
| Auth | http://localhost:8001/docs |
| Students | http://localhost:8002/docs |
| Courses | http://localhost:8003/docs |

For protected endpoints on a service's Swagger page, call `POST /auth/login`, copy the `access_token`, click **Authorize** and paste it. (The gateway's `/docs` lists every route but is best for reading; use the service pages or Postman to try requests.)

## Endpoints (all through the gateway at :8000)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Returns a JWT and the user |
| GET | `/auth/me` | Current user (validates the token) |
| POST/GET | `/students` | Create / list (`?q=` search, `?department=` filter) |
| GET/PUT/DELETE | `/students/{id}` | Read / update / delete |
| GET | `/students/{id}/courses` | Courses a student is enrolled in |
| POST/GET | `/courses` | Create / list (includes `enrolled_count`) |
| GET/PUT/DELETE | `/courses/{id}` | Read / update / delete |
| POST | `/courses/{id}/students` | Assign the course to a student `{"student_id": 1}` |
| GET | `/courses/{id}/students` | Students enrolled in the course |
| DELETE | `/courses/{id}/students/{student_id}` | Remove a student from the course |
| GET | `/health` | Gateway and service status |

## Postman

Import `postman/StudentManagement.postman_collection.json`. Run **Auth > Register**, then **Login** (it saves the token into `{{token}}`), then the other folders in order. Each request has a test that checks the status code. `baseUrl` defaults to `http://localhost:8000`.

## Screenshots to capture for submission

1. Register and login pages (including a validation error)
2. Dashboard
3. Students list, add/edit form, delete confirmation
4. Courses list and a course page with enrolled students
5. Swagger UI for each service
6. Postman collection run results

## Git

```bash
git init
git add .
git commit -m "Initial commit: student management microservices"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` files and `*.db` databases are git-ignored. Only `.env.example` is committed.

## Troubleshooting

- **"JWT_SECRET is not set"**: copy `.env.example` to `.env` in that service folder.
- **401 after login on student/course calls**: the `JWT_SECRET` differs between services. Make it identical.
- **Frontend says it can't reach the server**: start the API gateway on port 8000 and check `VITE_API_BASE_URL`.
- **503 from the gateway**: one of the three services isn't running. `GET /health` shows which.
- **CORS error**: add your frontend origin to `CORS_ORIGINS` in the gateway `.env`.
- <img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 05 12 PM" src="https://github.com/user-attachments/assets/151fea45-6ba9-48fb-8cc2-34f3be8b7870" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 05 05 PM" src="https://github.com/user-attachments/assets/25bfd548-23e3-4b0d-bbbb-d3ee9646830e" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 04 57 PM" src="https://github.com/user-attachments/assets/ad452a8b-8575-4398-8d25-3d835db55a6d" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 04 48 PM" src="https://github.com/user-attachments/assets/e25de458-ff6d-4914-b31d-0603453b6621" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 04 29 PM" src="https://github.com/user-attachments/assets/e9883226-4bdc-4826-8ec8-228c65975456" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 2 00 34 PM" src="https://github.com/user-attachments/assets/379107ec-34e3-490e-aae1-81a2e42ebd46" />
<img width="1470" height="956" alt="Screenshot 2026-10-23 at 1 59 45 PM" src="https://github.com/user-attachments/assets/3ec819c9-692d-4506-bb99-f2ef03db6423" />

