"""Fills the app with demo data through the API gateway (handy for screenshots).

Usage:  python scripts/seed.py
Needs the gateway (and services) running. Creates demo@campusly.dev / demo1234.
"""
import json
import os
import urllib.error
import urllib.request

GATEWAY = os.getenv("GATEWAY_URL", "http://localhost:8000").rstrip("/")


def call(method, path, body=None, token=None):
    req = urllib.request.Request(f"{GATEWAY}{path}", method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data) as res:
            raw = res.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as err:
        return {"_error": err.code, "detail": json.loads(err.read() or b"{}").get("detail")}


call("POST", "/auth/register", {"full_name": "Demo Admin", "email": "demo@campusly.dev", "password": "demo1234"})
login = call("POST", "/auth/login", {"email": "demo@campusly.dev", "password": "demo1234"})
token = login["access_token"]

students = [
    ("Aarav Mehta", "aarav.mehta@college.edu", "+91 98765 43210", "Computer Science", "B.Tech"),
    ("Priya Sharma", "priya.sharma@college.edu", "+91 98111 22334", "Computer Science", "M.Tech"),
    ("Rohan Iyer", "rohan.iyer@college.edu", "+91 99887 11223", "Electronics", "B.Tech"),
    ("Ananya Rao", "ananya.rao@college.edu", "+91 97654 33221", "Mathematics", "B.Sc"),
    ("Kabir Singh", "kabir.singh@college.edu", "+91 91234 56780", "Mechanical", "B.Tech"),
    ("Meera Nair", "meera.nair@college.edu", "+91 90909 80808", "Business", "MBA"),
    ("Ishaan Patel", "ishaan.patel@college.edu", "+91 98989 12121", "Design", "B.Des"),
    ("Sara Khan", "sara.khan@college.edu", "+91 95555 44332", "Computer Science", "B.Tech"),
]
courses = [
    ("CS101", "Introduction to Programming", "Python basics, problem solving and clean code.", "Dr. Rao", 4),
    ("CS240", "Data Structures", "Lists, trees, graphs and the algorithms that use them.", "Prof. Verma", 4),
    ("MA204", "Linear Algebra", "Vectors, matrices and transformations.", "Dr. Kulkarni", 3),
    ("EC110", "Digital Electronics", "Logic gates, circuits and microcontrollers.", "Dr. Bose", 3),
    ("BU301", "Marketing Fundamentals", "How products find their people.", "Prof. Dsouza", 2),
    ("DS150", "Design Studio", "Hands-on visual design projects.", "Ms. Kapoor", 3),
]

student_ids = []
for name, email, phone, dept, prog in students:
    r = call("POST", "/students", {"name": name, "email": email, "phone": phone, "department": dept, "course": prog}, token)
    if "_error" in r:
        print("student skipped:", email, r["detail"])
    else:
        student_ids.append(r["id"])

course_ids = []
for code, title, desc, instructor, credits in courses:
    r = call("POST", "/courses", {"code": code, "title": title, "description": desc, "instructor": instructor, "credits": credits}, token)
    if "_error" in r:
        print("course skipped:", code, r["detail"])
    else:
        course_ids.append(r["id"])

plan = {0: [0, 1, 2, 7], 1: [0, 1, 7], 2: [1, 3, 4], 3: [2, 4], 4: [5, 6], 5: [6, 5]}
for ci, sis in plan.items():
    if ci < len(course_ids):
        for si in sis:
            if si < len(student_ids):
                call("POST", f"/courses/{course_ids[ci]}/students", {"student_id": student_ids[si]}, token)

print("Done. Log in with demo@campusly.dev / demo1234")
