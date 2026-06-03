# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models

from app.routers.auth import router as auth_router
from app.routers.patient import router as patient_router
from app.routers.admin import router as admin_router
from app.routers.doctor import router as doctor_router
from app.routers.ws import router as ws_router # MUST BE IMPORTED

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartQ Care API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(admin_router)
app.include_router(doctor_router)
app.include_router(ws_router) # MUST BE INCLUDED

@app.get("/")
def read_root():
    return {"message": "SmartQ API is running."}