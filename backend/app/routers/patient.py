# backend/app/routers/patient.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, database, dependencies
from app.websocket import manager 

router = APIRouter(prefix="/patient", tags=["Patient Dashboard"])

@router.post("/appointments", response_model=schemas.AppointmentResponse)
def book_appointment(
    appointment: schemas.AppointmentCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user) 
):
    if current_user.role != models.UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
        
    doctor = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == appointment.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    new_appointment = models.Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id, # <-- THE FIX: Use the specific Doctor Profile ID
        disease=appointment.disease,
        is_emergency=appointment.is_emergency,
        scheduled_time=appointment.scheduled_time,
        status=models.AppointmentStatus.pending 
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment


@router.get("/my-appointments", response_model=List[schemas.AppointmentResponse])
def get_my_appointments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    appointments = db.query(models.Appointment).filter(models.Appointment.patient_id == current_user.id).all()
    return appointments


@router.post("/emergency-appointment", response_model=schemas.QueueResponse)
async def book_emergency_appointment(
    appointment: schemas.AppointmentCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
        
    doctor = db.query(models.DoctorProfile).filter(models.DoctorProfile.user_id == appointment.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    new_app = models.Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id, # <-- THE FIX: Use the specific Doctor Profile ID
        disease=appointment.disease,
        is_emergency=True,
        status=models.AppointmentStatus.approved
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    waiting_patients = db.query(models.LiveQueue).filter(
        models.LiveQueue.doctor_id == doctor.id, # Also updated this to doctor.id
        models.LiveQueue.status == models.QueueStatus.waiting
    ).all()
    
    for p in waiting_patients:
        p.position += 1
        p.estimated_wait_time_mins += 15 
        
    db.commit() 
    
    emergency_queue = models.LiveQueue(
        doctor_id=doctor.id, # Also updated this to doctor.id
        appointment_id=new_app.id,
        position=1,
        status=models.QueueStatus.waiting,
        estimated_wait_time_mins=0
    )
    
    db.add(emergency_queue)
    db.commit()
    db.refresh(emergency_queue)
    
    await manager.broadcast_queue_update(
        doctor.id, 
        {
            "action": "queue_updated", 
            "message": "An emergency patient has been added to the front of the line."
        }
    )
    
    return emergency_queue


@router.get("/doctors", response_model=List[schemas.UserResponse])
def get_available_doctors(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.role != models.UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can view this list")
        
    doctors = db.query(models.User).filter(models.User.role == models.UserRole.doctor).all()
    return doctors

# Add this to the very bottom of backend/app/routers/patient.py

@router.get("/my-queue", response_model=List[schemas.QueueResponse])
def get_my_queue(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    # Join the LiveQueue with Appointments to find only THIS patient's wait times
    queue_items = db.query(models.LiveQueue).join(
        models.Appointment, 
        models.LiveQueue.appointment_id == models.Appointment.id
    ).filter(models.Appointment.patient_id == current_user.id).all()
    
    return queue_items