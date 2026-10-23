import os
from dotenv import load_dotenv

load_dotenv()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001").rstrip("/")
STUDENT_SERVICE_URL = os.getenv("STUDENT_SERVICE_URL", "http://localhost:8002").rstrip("/")
COURSE_SERVICE_URL = os.getenv("COURSE_SERVICE_URL", "http://localhost:8003").rstrip("/")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# First path segment -> (display name, base url)
SERVICES = {
    "auth": ("Auth service", AUTH_SERVICE_URL),
    "students": ("Student service", STUDENT_SERVICE_URL),
    "courses": ("Course service", COURSE_SERVICE_URL),
}
