import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Force python-dotenv to find and load the .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Safety Check: If the URL is still None, stop the app and warn the developer
if not DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL is not set. Ensure your .env file exists in the backend/ folder and is formatted correctly.")

# SQLAlchemy requires the URL to start with 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()