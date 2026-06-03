# backend/app/routers/admin.py
import os
import joblib
import pandas as pd
import subprocess
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database, dependencies, security
from app.websocket import manager 

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])

# --- LOAD THE MACHINE LEARNING MODEL ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'wait_time_estimator.joblib')

try:
    wait_time_model = joblib.load(MODEL_PATH)
    print("✅ ML Wait Time Model loaded successfully!")
except Exception as e:
    wait_time_model = None
    print(f"⚠️ Warning: Could not load ML model. Falling back to static math. Error: {e}")

# --- USER MANAGEMENT ---

@router.post("/register-doctor", response_model=schemas.UserResponse)
def register_doctor(
    doctor_data: schemas.DoctorCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access Denied")
        
    existing_user = db.query(models.User).filter(models.User.email == doctor_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pwd = security.get_password_hash(doctor_data.password)
    new_user = models.User(
        name=doctor_data.name, email=doctor_data.email, phone=doctor_data.phone,
        gender=doctor_data.gender, birth_date=doctor_data.birth_date, address=doctor_data.address,
        password_hash=hashed_pwd, role=models.UserRole.doctor
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    new_profile = models.DoctorProfile(
        user_id=new_user.id, specialization=doctor_data.specialization,
        room_number=doctor_data.room_number, status="offline"
    )
    db.add(new_profile)
    db.commit()
    
    return new_user

@router.get("/doctors", response_model=List[schemas.UserResponse])
def get_all_doctors(
    db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    return db.query(models.User).filter(models.User.role == models.UserRole.doctor).all()

@router.get("/patients", response_model=List[schemas.UserResponse])
def get_all_patients(
    db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    return db.query(models.User).filter(models.User.role == models.UserRole.patient).all()

# --- QUEUE & APPOINTMENT MANAGEMENT ---

@router.get("/pending-appointments", response_model=List[schemas.AppointmentResponse])
def get_pending_appointments(
    db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    return db.query(models.Appointment).filter(models.Appointment.status == models.AppointmentStatus.pending).all()

@router.post("/approve-appointment/{appointment_id}")
async def approve_and_queue_appointment(
    appointment_id: int, db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins only")
        
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment or appointment.status != models.AppointmentStatus.pending:
        raise HTTPException(status_code=400, detail="Invalid appointment")
        
    appointment.status = models.AppointmentStatus.approved
    
    current_queue_size = db.query(models.LiveQueue).filter(models.LiveQueue.doctor_id == appointment.doctor_id).count()
    new_position = current_queue_size + 1
    
    # --- START THE STOPWATCH ---
    appointment.queued_at = datetime.utcnow()
    appointment.queue_size_at_booking = current_queue_size
    
    # 🧠 --- THE MACHINE LEARNING ESTIMATION --- 🧠
    if wait_time_model:
        input_data = pd.DataFrame([{
            'doctor_id': appointment.doctor_id,
            'disease': appointment.disease,
            'queue_size': current_queue_size
        }])
        raw_prediction = wait_time_model.predict(input_data)[0]
        estimated_wait = int(round(raw_prediction))
    else:
        estimated_wait = current_queue_size * 15 
    
    new_queue_entry = models.LiveQueue(
        doctor_id=appointment.doctor_id,
        appointment_id=appointment.id,
        position=new_position,
        status=models.QueueStatus.waiting,
        estimated_wait_time_mins=estimated_wait
    )
    
    db.add(new_queue_entry)
    db.commit()
    
    await manager.broadcast_queue_update(
        appointment.doctor_id, 
        {"action": "queue_updated", "message": f"A new patient was added to the queue."}
    )
    
    return {"message": "Appointment approved", "position": new_position, "estimated_wait": estimated_wait}

@router.get("/all-appointments", response_model=List[schemas.AppointmentResponse])
def get_all_appointments(
    db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    return db.query(models.Appointment).all()

@router.delete("/doctor/{doctor_id}")
def delete_doctor(
    doctor_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    doctor = db.query(models.User).filter(models.User.id == doctor_id, models.User.role == models.UserRole.doctor).first()
    if not doctor: raise HTTPException(status_code=404)
    db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == doctor_id).delete()
    db.delete(doctor)
    db.commit()
    return {"message": "Doctor deleted"}

@router.put("/doctor/{doctor_id}")
def update_doctor(
    doctor_id: int, doctor_data: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.admin: raise HTTPException(status_code=403)
    doctor = db.query(models.User).filter(models.User.id == doctor_id).first()
    if not doctor: raise HTTPException(status_code=404)
    if 'name' in doctor_data: doctor.name = doctor_data['name']
    if 'email' in doctor_data: doctor.email = doctor_data['email']
    if 'phone' in doctor_data: doctor.phone = doctor_data['phone']
    db.commit()
    return {"message": "Doctor updated"}

# --- RETRAIN MODEL ENDPOINT ---
@router.post("/retrain-model")
def trigger_model_retraining(current_user: models.User = Depends(dependencies.get_current_user)):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins only")
        
    try:
        SCRIPT_PATH = os.path.join(BASE_DIR, 'ml', 'train_model.py')
        subprocess.run(["python", SCRIPT_PATH], check=True)
        
        global wait_time_model
        wait_time_model = joblib.load(MODEL_PATH)
        
        return {"message": "AI Model successfully retrained on the latest real-world data!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")