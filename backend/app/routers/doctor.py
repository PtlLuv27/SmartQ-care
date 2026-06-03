# backend/app/routers/doctor.py
import os
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database, dependencies
from app.websocket import manager 

router = APIRouter(prefix="/doctor", tags=["Doctor Dashboard"])

def get_doctor_profile(user: models.User, db: Session):
    if user.role != models.UserRole.doctor:
        raise HTTPException(status_code=403, detail="Access denied. Doctors only.")
    profile = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")
    return profile

# --- PROFILE ROUTES ---

@router.get("/profile")
def get_profile(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    return {
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "specialization": doctor.specialization,
        "room_number": doctor.room_number
    }

@router.put("/profile")
def update_profile(
    profile_data: dict, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    
    if 'name' in profile_data: current_user.name = profile_data['name']
    if 'email' in profile_data: current_user.email = profile_data['email']
    if 'phone' in profile_data: current_user.phone = profile_data['phone']
    
    if 'specialization' in profile_data: doctor.specialization = profile_data['specialization']
    if 'room_number' in profile_data: doctor.room_number = profile_data['room_number']
    
    db.commit()
    return {"message": "Profile updated successfully."}

# --- QUEUE & APPOINTMENT ROUTES ---

@router.get("/future-appointments", response_model=List[schemas.AppointmentResponse])
def get_future_appointments(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor.id,
        models.Appointment.scheduled_time != None,
        models.Appointment.status != models.AppointmentStatus.completed
    ).order_by(models.Appointment.scheduled_time.asc()).all()
    
    return appointments

@router.get("/my-queue", response_model=List[schemas.QueueResponse])
def view_queue(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    queue = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id
    ).order_by(models.LiveQueue.position.asc()).all()
    
    return queue

@router.post("/call-next")
async def call_next_patient(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    
    # 1. Complete the current active patient session
    current_active = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id, 
        models.LiveQueue.status == models.QueueStatus.active
    ).first()
    
    if current_active:
        appointment = db.query(models.Appointment).filter(models.Appointment.id == current_active.appointment_id).first()
        if appointment:
            appointment.status = models.AppointmentStatus.completed
        db.delete(current_active)
        db.commit()

    # 2. Find the next waiting patient (Position 1)
    next_patient = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id,
        models.LiveQueue.status == models.QueueStatus.waiting
    ).order_by(models.LiveQueue.position.asc()).first()
    
    if not next_patient:
        return {"message": "Queue is currently empty."}
        
    # --- STOP THE WATCH & SAVE REAL DATA ---
    appointment = db.query(models.Appointment).filter(models.Appointment.id == next_patient.appointment_id).first()
    if appointment and appointment.queued_at:
        appointment.started_at = datetime.utcnow()
        
        # Calculate actual wait time in minutes
        time_diff = appointment.started_at - appointment.queued_at
        actual_wait_mins = int(time_diff.total_seconds() / 60.0)
        
        # Append this real data point to our training CSV
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        CSV_PATH = os.path.join(BASE_DIR, 'ml', 'hospital_data.csv')
        
        try:
            with open(CSV_PATH, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([appointment.doctor_id, appointment.disease, appointment.queue_size_at_booking, actual_wait_mins])
            print(f"📈 Real data saved! Patient waited {actual_wait_mins} mins.")
        except Exception as e:
            print("Could not save to CSV:", e)

    # 3. Mark them as actively in session
    next_patient.status = models.QueueStatus.active
    
    # 4. Shift the rest of the queue forward
    waiting_patients = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id,
        models.LiveQueue.status == models.QueueStatus.waiting
    ).all()
    
    for p in waiting_patients:
        p.position -= 1
        p.estimated_wait_time_mins = max(0, p.estimated_wait_time_mins - 15)
        
    db.commit()
    
    # 5. Broadcast the update
    await manager.broadcast_queue_update(
        doctor.id, 
        {
            "action": "patient_called", 
            "appointment_id": next_patient.appointment_id, 
            "message": "The doctor is ready for you."
        }
    )
    
    return {
        "message": "Next patient called successfully.", 
        "now_serving_appointment": next_patient.appointment_id
    }

@router.post("/leave-session")
async def pause_session(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    
    doctor.status = "away"
    db.commit()
    
    await manager.broadcast_queue_update(
        doctor.id, 
        {"action": "doctor_status_changed", "status": "away", "message": "Doctor had to leave urgently. Please wait."}
    )
    
    return {"message": "Session paused. Patients will be notified of the delay."}

@router.post("/end-session")
async def end_session(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    doctor = get_doctor_profile(current_user, db)
    
    doctor.status = "offline"
    
    current_active = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id, 
        models.LiveQueue.status == models.QueueStatus.active
    ).first()
    
    if current_active:
        app = db.query(models.Appointment).filter(models.Appointment.id == current_active.appointment_id).first()
        if app:
            app.status = models.AppointmentStatus.completed
        db.delete(current_active)
        
    db.commit()
    
    await manager.broadcast_queue_update(
        doctor.id, 
        {"action": "doctor_status_changed", "status": "offline", "message": "The doctor has ended their session for the day."}
    )
    
    return {"message": "Session ended successfully."}