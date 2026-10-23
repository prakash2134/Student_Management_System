from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .config import (
    AUTH_SERVICE_URL,
    COURSE_SERVICE_URL,
    CORS_ORIGINS,
    SERVICES,
    STUDENT_SERVICE_URL,
)

FORWARDED_HEADERS = ("authorization", "content-type", "accept")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.client = httpx.AsyncClient(timeout=10)
    yield
    await app.state.client.aclose()


app = FastAPI(
    title="API Gateway",
    description=(
        "Single entry point for the frontend. Requests are routed to the auth, student "
        "and course services. Each service also exposes its own Swagger UI at /docs."
    ),
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def resolve_target(path: str) -> tuple[str, str, str] | None:
    """Return (service name, base url, upstream path) for a request path, or None if unknown."""
    parts = [p for p in path.split("/") if p]
    if not parts or parts[0] not in SERVICES:
        return None
    name, base = SERVICES[parts[0]]
    # /students/{id}/courses is owned by the course service
    if len(parts) == 3 and parts[0] == "students" and parts[2] == "courses":
        return "Course service", COURSE_SERVICE_URL, f"/enrollments/student/{parts[1]}"
    return name, base, path


async def proxy(request: Request) -> Response:
    target = resolve_target(request.url.path)
    if target is None:
        return JSONResponse(
            status_code=404,
            content={"detail": f"No route for {request.method} {request.url.path}"},
        )
    name, base, upstream_path = target
    headers = {k: v for k, v in request.headers.items() if k.lower() in FORWARDED_HEADERS}
    body = await request.body()
    try:
        upstream = await request.app.state.client.request(
            request.method,
            f"{base}{upstream_path}",
            params=request.query_params,
            content=body or None,
            headers=headers,
        )
    except httpx.ConnectError:
        return JSONResponse(status_code=503, content={"detail": f"{name} is unavailable. Please try again shortly."})
    except httpx.TimeoutException:
        return JSONResponse(status_code=504, content={"detail": f"{name} took too long to respond."})
    except httpx.HTTPError:
        return JSONResponse(status_code=502, content={"detail": f"Could not reach the {name.lower()}."})

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


# ---- Documented routes (all handled by the same proxy) ----
ROUTES = [
    ("Auth", "POST", "/auth/register", "Register a new user"),
    ("Auth", "POST", "/auth/login", "Log in and get a JWT"),
    ("Auth", "GET", "/auth/me", "Current user"),
    ("Students", "POST", "/students", "Create a student"),
    ("Students", "GET", "/students", "List students"),
    ("Students", "GET", "/students/{student_id}", "Get one student"),
    ("Students", "PUT", "/students/{student_id}", "Update a student"),
    ("Students", "DELETE", "/students/{student_id}", "Delete a student"),
    ("Students", "GET", "/students/{student_id}/courses", "Courses a student is enrolled in"),
    ("Courses", "POST", "/courses", "Create a course"),
    ("Courses", "GET", "/courses", "List courses"),
    ("Courses", "GET", "/courses/{course_id}", "Get one course"),
    ("Courses", "PUT", "/courses/{course_id}", "Update a course"),
    ("Courses", "DELETE", "/courses/{course_id}", "Delete a course"),
    ("Courses", "GET", "/courses/{course_id}/students", "Students enrolled in a course"),
    ("Courses", "POST", "/courses/{course_id}/students", "Assign a course to a student"),
    ("Courses", "DELETE", "/courses/{course_id}/students/{student_id}", "Remove a student from a course"),
]
for tag, method, path, summary in ROUTES:
    app.add_api_route(path, proxy, methods=[method], tags=[tag], summary=summary)


@app.get("/health", tags=["Health"], summary="Gateway and downstream service status")
async def health(request: Request):
    services = {}
    for key, url in (("auth", AUTH_SERVICE_URL), ("students", STUDENT_SERVICE_URL), ("courses", COURSE_SERVICE_URL)):
        try:
            r = await request.app.state.client.get(f"{url}/health", timeout=2)
            services[key] = "up" if r.status_code == 200 else "degraded"
        except httpx.HTTPError:
            services[key] = "down"
    overall = "ok" if all(v == "up" for v in services.values()) else "degraded"
    return {"gateway": "ok", "status": overall, "services": services}


# Anything else (unknown path or method) -> JSON 404
@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
async def not_found(request: Request, full_path: str):
    return JSONResponse(status_code=404, content={"detail": f"No route for {request.method} /{full_path}"})
