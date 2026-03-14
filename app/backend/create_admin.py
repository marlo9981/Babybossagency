"""
Run once to create an admin account with full access.
Usage: python3 create_admin.py
"""
import sys
sys.path.insert(0, ".")

from db import init_db, SessionLocal, User
from auth_utils import hash_password

EMAIL = "admin@agency.com"
PASSWORD = "admin123"

init_db()
db = SessionLocal()

existing = db.query(User).filter(User.email == EMAIL).first()
if existing:
    existing.plan = "retainer"
    existing.credits = 99999
    db.commit()
    print(f"Updated existing user {EMAIL} → plan=retainer, credits=99999")
else:
    user = User(
        email=EMAIL,
        hashed_password=hash_password(PASSWORD),
        plan="retainer",
        credits=99999,
    )
    db.add(user)
    db.commit()
    print(f"Admin created: {EMAIL} / {PASSWORD}")

db.close()
