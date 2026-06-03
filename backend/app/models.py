import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
# Add these inside your class Appointment(Base):
from datetime import datetime
from sqlalchemy import DateTime, Integer

# ... existing columns ...
queue_size_at_booking = Column(Integer, nullable=True) # How many people were ahead of them?
queued_at = Column(DateTime, nullable=True) # Exact time Admin clicked "Approve"
started_at = Column(DateTime, nullable=True) # Exact time Doctor clicked "Call Next"


# --- Enums ---
class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"

class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    completed = "completed"
    cancelled = "cancelled"

class QueueStatus(str, enum.Enum):
    waiting = "waiting"
    called = "called"
    active = "active"

class DoctorStatus(str, enum.Enum):
    active = "active"
    away = "away"
    offline = "offline"

# --- Tables ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    gender = Column(String(15))
    birth_date = Column(Date)
    address = Column(Text)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.patient, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", foreign_keys='Appointment.patient_id')

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization = Column(String(100), nullable=False)
    room_number = Column(String(20))
    status = Column(Enum(DoctorStatus), default=DoctorStatus.offline, nullable=False)
    
    user = relationship("User", back_populates="doctor_profile")
    queue_entries = relationship("LiveQueue", back_populates="doctor")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    disease = Column(Text, nullable=False)
    is_emergency = Column(Boolean, default=False, nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=True) # Null = instant
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("User", back_populates="appointments", foreign_keys=[patient_id])
    queue_entry = relationship("LiveQueue", back_populates="appointment", uselist=False)

class LiveQueue(Base):
    __tablename__ = "live_queue"
    __table_args__ = (UniqueConstraint('doctor_id', 'position', name='uq_doctor_position'),)

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(Enum(QueueStatus), default=QueueStatus.waiting, nullable=False)
    estimated_wait_time_mins = Column(Integer, default=0, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("DoctorProfile", back_populates="queue_entries")
    appointment = relationship("Appointment", back_populates="queue_entry")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text)
    performed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())