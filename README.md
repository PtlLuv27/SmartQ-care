# SmartQ Care 🏥🤖

> **An Intelligent, Real-Time Hospital Queue Management System**
> *Developed by the Shivalik Team*

SmartQ Care is a modern, full-stack web application designed to eliminate hospital waiting room chaos. By combining real-time WebSocket communication with an actively learning Machine Learning model, the platform provides dynamic, highly accurate wait-time estimations and seamless patient flow management.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [ML Pipeline Deep Dive](#-how-the-machine-learning-pipeline-works)
- [API Reference](#-api-reference)
- [Role-Based Access](#-role-based-access)
- [WebSocket Events](#-websocket-events)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [ML Model Initialization](#2-initialize-the-machine-learning-model)
  - [Start the Backend Server](#3-start-the-backend-server)
  - [Frontend Setup](#4-frontend-setup)
---

## Overview

Traditional hospital queue systems rely on static, fixed-time estimations that fail to account for dynamic variables like patient severity, doctor consultation speed, or real-time queue fluctuations. SmartQ Care addresses this by introducing a **Continuous Learning Loop** — a self-improving ML pipeline that grows smarter with every patient interaction.

The system serves three distinct user roles — **Patients**, **Doctors**, and **Administrators** — each with a tailored dashboard optimized for their specific workflow.

---

## 🌟 Key Features

### 👨‍⚕️ Doctor Portal

| Feature | Description |
|---|---|
| **Live Session Management** | One-click controls to Start, Pause, or End shifts with real-time status broadcasting |
| **Auto-Polling Queue** | The waiting list auto-refreshes without manual page reloads |
| **Emergency Bypass Alerts** | Full-screen visual alerts triggered when an admin flags a patient for emergency bypass |
| **Continuous Data Collection** | Automatically calculates exact consultation durations in the background to feed the ML model |

### 🛡️ Administrator Dashboard

| Feature | Description |
|---|---|
| **Central Control Room** | Approve pending appointments and push them instantly into the live queue |
| **Staff Management** | Register new doctors, assign room numbers, and manage credentials |
| **Patient History** | View comprehensive, chronological logs of all patient visits |
| **AI Retraining Hub** | One-click trigger to retrain the ML wait-time estimator on the latest historical data |

### 🤒 Patient Dashboard

| Feature | Description |
|---|---|
| **Smart Booking** | Request immediate queue placement or schedule future appointments |
| **Dynamic Wait Times** | View real-time, AI-predicted wait estimations that adjust based on disease severity and doctor speed |
| **Real-Time Alerts** | WebSocket-powered instant "It's your turn!" modal popups when the doctor calls them |

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React (Vite)** | Component-based UI with fast HMR development server |
| **Tailwind CSS** | Utility-first styling for responsive, consistent design |
| **Lucide React** | Clean, consistent icon library |
| **Axios** | Promise-based HTTP client for API communication |
| **Context API** | Global state management for authentication and user data |

### Backend

| Technology | Purpose |
|---|---|
| **FastAPI** | High-performance async Python web framework |
| **PostgreSQL** | Robust relational database for persistent data storage |
| **SQLAlchemy** | ORM for type-safe, Pythonic database interactions |
| **WebSockets** | Real-time bidirectional communication channel |
| **Uvicorn** | Lightning-fast ASGI server for async Python apps |

### Machine Learning Pipeline

| Technology | Purpose |
|---|---|
| **Scikit-Learn** | Random Forest Regressor for wait-time prediction |
| **Pandas** | Data manipulation and CSV management |
| **Joblib** | Model serialization and efficient loading |
| **Continuous Learning Architecture** | Auto-appending CSV with hot-reloading model swaps |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Patient UI  │  │   Doctor Portal  │  │   Admin Panel    │  │
│  │  (React/Vite)│  │   (React/Vite)   │  │   (React/Vite)   │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
└─────────┼───────────────────┼────────────────────┼─────────────┘
          │   HTTP/REST        │   WebSocket         │
          ▼                   ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (FastAPI)                        │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  REST API  │  │  WebSocket   │  │   ML Inference Engine  │   │
│  │  Endpoints │  │  Hub         │  │   (Random Forest)      │   │
│  └────────────┘  └──────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────────────┐              ┌───────────────────────┐
│  PostgreSQL Database │              │  ML Model Storage     │
│  - users             │              │  - hospital_data.csv  │
│  - appointments      │              │  - estimator.joblib   │
│  - queue_entries     │              └───────────────────────┘
│  - consultation_logs │
└──────────────────────┘
```

## 📁 Project Structure

```
smartq-care/
│
├── backend/
│   ├── app/
│   │   ├── database.py          # DB connection & session management
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT authentication utilities
│   │   ├── websocket_manager.py # WebSocket connection manager
│   │   └── routers/
│   │       ├── admin.py         # Admin-only endpoints
│   │       ├── doctor.py        # Doctor-only endpoints
│   │       ├── patient.py       # Patient-facing endpoints
│   │       └── queue.py         # Queue management logic
│   ├── ml/
│   │   ├── generate_data.py     # Synthetic data generator
│   │   ├── train_model.py       # Model training script
│   │   ├── predict.py           # Inference utility functions
│   │   ├── hospital_data.csv    # Auto-appended training data
│   │   └── wait_time_estimator.joblib  # Serialized ML model
│   └── main.py                  # FastAPI app entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── PatientDashboard.jsx
    │   │   ├── DoctorPortal.jsx
    │   │   └── AdminPanel.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global auth state
    │   ├── api/
    │   │   └── axios.js          # Configured Axios instance
    │   └── App.jsx
    ├── index.html
    └── vite.config.js
```

---

## 🧠 How the Machine Learning Pipeline Works

<img src="frontend/src/assets/ml_model.png" alt="ML Model Diagram" width="600"/>

Unlike standard systems that use static math (e.g., `Queue Size × 15 mins`), SmartQ Care features a **Continuous Learning Loop** that improves over time with real patient data.

### Step 1: Prediction

When an Administrator approves a patient, the FastAPI backend immediately calls the ML inference engine. The **Random Forest Regressor** analyzes:

- Patient's reported symptoms and disease category
- Assigned doctor's historical consultation speed
- Current live queue length

It returns a **tailored, personalized wait-time estimate** — not a generic average.

```
Input Features:
  ├── disease_severity    (encoded symptom category)
  ├── doctor_id           (encoded doctor identifier)
  └── current_queue_size  (live count at approval time)

Output:
  └── predicted_wait_minutes  (float)
```

### Step 2: Real-World Data Collection

When the Doctor clicks **"Call Next"**, the system:

1. Stops the consultation clock for the current patient
2. Calculates the exact real-world wait duration in minutes
3. Appends a new labeled data point directly to `hospital_data.csv`

This ensures the model is always trained on the most current, real hospital behavior.

### Step 3: Hot-Retraining (Zero Downtime)

When the Admin clicks **"Retrain AI"**:

1. A background subprocess reads the updated `hospital_data.csv`
2. A brand-new `RandomForestRegressor` is trained on all accumulated data
3. The new `.joblib` model file is written to disk
4. The model is **hot-swapped in memory** — no server restart required

```
hospital_data.csv  ──►  train_model.py  ──►  wait_time_estimator.joblib
        ▲                                              │
        │                                             ▼
  (new real data)                         (hot-swapped in memory)
        ▲                                              │
        │                                             ▼
  Doctor clicks                              Predictions immediately
  "Call Next"                                use the updated model
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/auth/login` | Authenticate and receive JWT token | Public |
| `POST` | `/auth/register` | Register a new patient account | Public |

### Patient Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/patient/book` | Request immediate or scheduled appointment | Patient |
| `GET` | `/patient/queue-status` | Get current queue position and wait estimate | Patient |
| `GET` | `/patient/history` | View personal visit history | Patient |

### Doctor Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/doctor/session/start` | Begin an active shift | Doctor |
| `POST` | `/doctor/session/pause` | Temporarily pause the shift | Doctor |
| `POST` | `/doctor/session/end` | End the shift | Doctor |
| `POST` | `/doctor/call-next` | Mark current patient complete, call next | Doctor |
| `GET` | `/doctor/queue` | Get the live waiting list | Doctor |

### Admin Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/admin/pending` | List all pending appointment requests | Admin |
| `POST` | `/admin/approve/{id}` | Approve and push patient into live queue | Admin |
| `POST` | `/admin/emergency/{id}` | Flag a patient for emergency bypass | Admin |
| `POST` | `/admin/doctors/register` | Register a new doctor account | Admin |
| `GET` | `/admin/history` | View all patient visit logs | Admin |
| `POST` | `/admin/ml/retrain` | Trigger ML model retraining | Admin |

---

## 👥 Role-Based Access

The system uses **JWT-based authentication** with three distinct roles. Each role is scoped to specific routes and UI views.

```
┌──────────┬───────────────────────────────────────────────────────┐
│  Role    │  Capabilities                                         │
├──────────┼───────────────────────────────────────────────────────┤
│ Patient  │ Book appointments, view queue position & wait time,   │
│          │ receive real-time "your turn" notifications           │
├──────────┼───────────────────────────────────────────────────────┤
│ Doctor   │ Manage shift sessions, view auto-refreshing queue,    │
│          │ call next patient, receive emergency bypass alerts     │
├──────────┼───────────────────────────────────────────────────────┤
│ Admin    │ Full system control — approve/manage appointments,     │
│          │ register staff, view all history, retrain AI model    │
└──────────┴───────────────────────────────────────────────────────┘
```

---

## 🔌 WebSocket Events

The system uses WebSockets for all real-time notifications. Clients connect to:

```
ws://127.0.0.1:8000/ws/{user_id}
```

### Events Broadcast by Server

| Event | Payload | Triggered When |
|-------|---------|----------------|
| `your_turn` | `{ patient_id, doctor_name, room_number }` | Doctor calls the next patient |
| `queue_update` | `{ queue_length, your_position, estimated_wait }` | Any queue state change |
| `emergency_bypass` | `{ patient_id, patient_name }` | Admin flags a patient for emergency |
| `session_update` | `{ doctor_id, status }` | Doctor starts, pauses, or ends shift |

---

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine.

### Prerequisites

Ensure the following are installed and running before proceeding:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **Python** 3.8 or higher — [Download](https://python.org/)
- **PostgreSQL** running locally or via a cloud provider (e.g., [Aiven](https://aiven.io/))

---

### 1. Backend Setup

Navigate to the backend directory and set up your Python virtual environment:

```bash
cd backend
python -m venv venv
```

**Activate the virtual environment:**

```bash
# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**Install all required Python packages:**

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib python-jose websockets pandas scikit-learn joblib
```

**Configure the database connection:**

Open `backend/app/database.py` and update the connection string to match your PostgreSQL instance:

```python
# Example connection string
DATABASE_URL = "postgresql://username:password@localhost:5432/smartq_care"
```

---

### 2. Initialize the Machine Learning Model

Before starting the server, you must generate the initial training data and train the first model. These steps only need to be run once (or when you want to reset the model from scratch).

**Step 1: Generate 5,000 synthetic historical records**

```bash
python ml/generate_data.py
```

**Step 2: Train the Random Forest Regressor on the generated data**

```bash
python ml/train_model.py
```

**Verify the outputs:**

Check that the following files exist inside the `/ml` folder before proceeding:

```
ml/
├── hospital_data.csv         ✅  (training data)
└── wait_time_estimator.joblib ✅  (serialized model)
```

> ⚠️ **Important:** If either file is missing, the backend server will fail to start or predictions will be unavailable.

---

### 3. Start the Backend Server

Run the FastAPI application using Uvicorn with hot-reload enabled:

```bash
uvicorn main:app --reload
```

The API will be available at:

```
http://127.0.0.1:8000
```

Explore the interactive API documentation at:

```
http://127.0.0.1:8000/docs      # Swagger UI
http://127.0.0.1:8000/redoc     # ReDoc
```

---

### 4. Frontend Setup

Open a **new terminal window** and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The web application will be available at:

```
http://localhost:5173
```

---

## ⚙️ Configuration

### Environment Variables (Backend)

Create a `.env` file in the `/backend` directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/smartq_care

# Authentication
SECRET_KEY=your-super-secret-jwt-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ML Model
ML_MODEL_PATH=ml/wait_time_estimator.joblib
ML_DATA_PATH=ml/hospital_data.csv
```

### Frontend API Base URL

Update the Axios base URL in `frontend/src/api/axios.js`:

```javascript
const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000",  // Update for production deployment
  timeout: 10000,
});
```

---

## 🔒 Security Notes

- All passwords are hashed using **bcrypt** via `passlib` — plain-text passwords are never stored.
- API routes are protected by **JWT Bearer tokens** — expired or invalid tokens are rejected automatically.
- Role checks are enforced server-side — frontend role restrictions alone are not relied upon for security.
- WebSocket connections authenticate via token query parameters on connection.
