from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CourseBase(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    title: str = Field(min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    instructor: str | None = Field(default=None, max_length=100)
    credits: int = Field(default=3, ge=1, le=10)

    @field_validator("code")
    @classmethod
    def clean_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) < 2:
            raise ValueError("Course code must be at least 2 characters")
        return v

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Title must be at least 2 characters")
        return v

    @field_validator("description", "instructor")
    @classmethod
    def clean_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(CourseBase):
    pass


class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    enrolled_count: int = 0


class EnrollRequest(BaseModel):
    student_id: int = Field(gt=0)


class EnrolledStudent(BaseModel):
    student_id: int
    enrolled_at: datetime
    student: dict | None = None  # details from the student service, if reachable
