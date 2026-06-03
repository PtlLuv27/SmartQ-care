# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app import models, schemas, database, security

# Prefix /auth means all routes here start with /auth (e.g., /auth/register)
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # 1. Check if the email is already in use
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash the plain text password
    hashed_pwd = security.get_password_hash(user.password)
    
    # 3. Create the new user object
    new_user = models.User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        gender=user.gender,
        birth_date=user.birth_date,
        address=user.address,
        password_hash=hashed_pwd,
        role=models.UserRole.patient # New registrations default to patient
    )
    
    # 4. Save to PostgreSQL
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # 1. Find the user by email (OAuth2 uses 'username' for the email field)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Verify existence and password match
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Generate JWT Token containing their email and role
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}