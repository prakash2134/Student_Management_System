import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, schemas
from .config import STUDENT_SERVICE_URL
from .database import Base, engine, get_db
from .security import get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Course Service",
    description="Course CRUD and student enrollments. All endpoints require a JWT from the auth service.",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ---------- helpers ----------
def _course_or_404(db: Session, course_id: int) -> models.Course:
    course = db.get(models.Course, course_id)
    if course is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Course {course_id} not found")
    return course


def _enrolled_count(db: Session, course_id: int) -> int:
    return db.scalar(select(func.count(models.Enrollment.id)).where(models.Enrollment.course_id == course_id)) or 0


def _to_out(db: Session, course: models.Course) -> schemas.CourseOut:
    out = schemas.CourseOut.model_validate(course)
    out.enrolled_count = _enrolled_count(db, course.id)
    return out


def _code_taken(db: Session, code: str, exclude_id: int | None = None) -> bool:
    query = select(models.Course).where(models.Course.code == code)
    if exclude_id is not None:
        query = query.where(models.Course.id != exclude_id)
    return db.scalar(query) is not None


def _auth_header(request: Request) -> dict:
    return {"Authorization": request.headers.get("authorization", "")}


# ---------- health ----------
@app.get("/health", tags=["Health"])
def health():
    return {"service": "course-service", "status": "ok"}


# ---------- courses CRUD ----------
@app.post("/courses", response_model=schemas.CourseOut, status_code=201, tags=["Courses"])
def create_course(
    data: schemas.CourseCreate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)
):
    if _code_taken(db, data.code):
        raise HTTPException(status.HTTP_409_CONFLICT, f"A course with code {data.code} already exists")
    course = models.Course(**data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return _to_out(db, course)


@app.get("/courses", response_model=list[schemas.CourseOut], tags=["Courses"])
def list_courses(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    courses = db.scalars(select(models.Course).order_by(models.Course.code)).all()
    counts = dict(
        db.execute(
            select(models.Enrollment.course_id, func.count(models.Enrollment.id)).group_by(
                models.Enrollment.course_id
            )
        ).all()
    )
    result = []
    for course in courses:
        out = schemas.CourseOut.model_validate(course)
        out.enrolled_count = counts.get(course.id, 0)
        result.append(out)
    return result


@app.get("/courses/{course_id}", response_model=schemas.CourseOut, tags=["Courses"])
def get_course(course_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    return _to_out(db, _course_or_404(db, course_id))


@app.put("/courses/{course_id}", response_model=schemas.CourseOut, tags=["Courses"])
def update_course(
    course_id: int,
    data: schemas.CourseUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    course = _course_or_404(db, course_id)
    if _code_taken(db, data.code, exclude_id=course_id):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Another course already uses code {data.code}")
    for field, value in data.model_dump().items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return _to_out(db, course)


@app.delete("/courses/{course_id}", status_code=204, tags=["Courses"])
def delete_course(course_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    course = _course_or_404(db, course_id)
    db.delete(course)
    db.commit()
    return Response(status_code=204)


# ---------- enrollments ----------
@app.post(
    "/courses/{course_id}/students",
    response_model=schemas.EnrolledStudent,
    status_code=201,
    tags=["Enrollments"],
    summary="Assign a course to a student",
)
def enroll_student(
    course_id: int,
    data: schemas.EnrollRequest,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    _course_or_404(db, course_id)

    # Confirm the student exists by asking the student service.
    student = None
    try:
        resp = httpx.get(
            f"{STUDENT_SERVICE_URL}/students/{data.student_id}", headers=_auth_header(request), timeout=3
        )
    except httpx.HTTPError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Student service is unavailable")
    if resp.status_code == 404:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Student {data.student_id} not found")
    if resp.status_code == 200:
        student = resp.json()
    elif resp.status_code != 200:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not verify the student")

    enrollment = models.Enrollment(course_id=course_id, student_id=data.student_id)
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This student is already enrolled in the course")
    db.refresh(enrollment)
    return schemas.EnrolledStudent(
        student_id=enrollment.student_id, enrolled_at=enrollment.enrolled_at, student=student
    )


@app.get(
    "/courses/{course_id}/students",
    response_model=list[schemas.EnrolledStudent],
    tags=["Enrollments"],
    summary="Students enrolled in a course",
)
def course_students(
    course_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    _course_or_404(db, course_id)
    enrollments = db.scalars(
        select(models.Enrollment).where(models.Enrollment.course_id == course_id).order_by(models.Enrollment.id)
    ).all()

    students_by_id: dict[int, dict] = {}
    if enrollments:
        try:
            resp = httpx.get(f"{STUDENT_SERVICE_URL}/students", headers=_auth_header(request), timeout=3)
            if resp.status_code == 200:
                students_by_id = {s["id"]: s for s in resp.json()}
        except httpx.HTTPError:
            pass  # return enrollments without details rather than failing

    return [
        schemas.EnrolledStudent(
            student_id=e.student_id, enrolled_at=e.enrolled_at, student=students_by_id.get(e.student_id)
        )
        for e in enrollments
    ]


@app.delete(
    "/courses/{course_id}/students/{student_id}",
    status_code=204,
    tags=["Enrollments"],
    summary="Remove a student from a course",
)
def unenroll_student(
    course_id: int, student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)
):
    enrollment = db.scalar(
        select(models.Enrollment).where(
            models.Enrollment.course_id == course_id, models.Enrollment.student_id == student_id
        )
    )
    if enrollment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    db.delete(enrollment)
    db.commit()
    return Response(status_code=204)


@app.get(
    "/enrollments/student/{student_id}",
    response_model=list[schemas.CourseOut],
    tags=["Enrollments"],
    summary="Courses a student is enrolled in",
)
def student_courses(student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    courses = db.scalars(
        select(models.Course)
        .join(models.Enrollment, models.Enrollment.course_id == models.Course.id)
        .where(models.Enrollment.student_id == student_id)
        .order_by(models.Course.code)
    ).all()
    return [_to_out(db, c) for c in courses]


@app.delete(
    "/enrollments/student/{student_id}",
    status_code=204,
    tags=["Enrollments"],
    summary="Remove all enrollments of a student (used when a student is deleted)",
)
def remove_student_enrollments(
    student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)
):
    for enrollment in db.scalars(select(models.Enrollment).where(models.Enrollment.student_id == student_id)).all():
        db.delete(enrollment)
    db.commit()
    return Response(status_code=204)
