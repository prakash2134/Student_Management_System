import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .config import COURSE_SERVICE_URL
from .database import Base, engine, get_db
from .security import get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Student Service",
    description="CRUD operations for student records. All endpoints require a JWT from the auth service.",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _get_or_404(db: Session, student_id: int) -> models.Student:
    student = db.get(models.Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Student {student_id} not found")
    return student


def _email_taken(db: Session, email: str, exclude_id: int | None = None) -> bool:
    query = select(models.Student).where(models.Student.email == email)
    if exclude_id is not None:
        query = query.where(models.Student.id != exclude_id)
    return db.scalar(query) is not None


@app.get("/health", tags=["Health"])
def health():
    return {"service": "student-service", "status": "ok"}


@app.post("/students", response_model=schemas.StudentOut, status_code=201, tags=["Students"])
def create_student(
    data: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    if _email_taken(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "A student with this email already exists")
    student = models.Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@app.get("/students", response_model=list[schemas.StudentOut], tags=["Students"])
def list_students(
    q: str | None = Query(default=None, description="Search by name or email"),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    query = select(models.Student).order_by(models.Student.id.desc())
    if q:
        like = f"%{q.strip()}%"
        query = query.where(or_(models.Student.name.ilike(like), models.Student.email.ilike(like)))
    if department:
        query = query.where(models.Student.department == department)
    return db.scalars(query).all()


@app.get("/students/{student_id}", response_model=schemas.StudentOut, tags=["Students"])
def get_student(student_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    return _get_or_404(db, student_id)


@app.put("/students/{student_id}", response_model=schemas.StudentOut, tags=["Students"])
def update_student(
    student_id: int,
    data: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    student = _get_or_404(db, student_id)
    if _email_taken(db, data.email, exclude_id=student_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Another student already uses this email")
    for field, value in data.model_dump().items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


@app.delete("/students/{student_id}", status_code=204, tags=["Students"])
def delete_student(
    student_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    student = _get_or_404(db, student_id)
    db.delete(student)
    db.commit()
    # Best effort: ask the course service to drop this student's enrollments.
    try:
        httpx.delete(
            f"{COURSE_SERVICE_URL}/enrollments/student/{student_id}",
            headers={"Authorization": request.headers.get("authorization", "")},
            timeout=3,
        )
    except httpx.HTTPError:
        pass
    return Response(status_code=204)
