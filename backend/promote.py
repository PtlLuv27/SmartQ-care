# backend/promote.py
from app.database import SessionLocal
from app.models import User, UserRole

db = SessionLocal()
# Replace with the exact email you registered with earlier
target_email = "luvpatel2707@gmail.com" 

user = db.query(User).filter(User.email == target_email).first()
if user:
    user.role = UserRole.admin
    db.commit()
    print(f"Success! {target_email} is now an Admin.")
else:
    print("User not found.")
db.close()