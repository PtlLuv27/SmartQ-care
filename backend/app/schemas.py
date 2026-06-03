# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import date, datetime
from typing import Optional
from app.models import UserRole  
from app.models import AppointmentStatus
from app.models import QueueStatus

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    gender: str 
    birth_date: date
    address: str
    password: str 

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AppointmentCreate(BaseModel):
    doctor_id: int
    disease: str
    is_emergency: bool = False
    scheduled_time: Optional[datetime] = None  # Null means "right now"

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    disease: str
    is_emergency: bool
    scheduled_time: Optional[datetime]
    status: AppointmentStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DoctorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    gender: str 
    birth_date: date
    address: str
    password: str
    specialization: str
    room_number: str

class QueueResponse(BaseModel):
    id: int
    doctor_id: int
    appointment_id: int
    position: int
    status: QueueStatus
    estimated_wait_time_mins: int
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str