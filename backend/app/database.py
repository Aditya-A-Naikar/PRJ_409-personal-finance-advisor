from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# If SQLite URL is relative (e.g. sqlite:///./finance.db), resolve it relative to backend/ directory
# so it always connects to backend/finance.db regardless of the execution working directory.
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///."):
    backend_dir = Path(__file__).resolve().parent.parent
    rel_path = db_url.replace("sqlite:///", "")
    abs_path = (backend_dir / rel_path).resolve()
    db_url = f"sqlite:///{abs_path}"

# check_same_thread=False is required for SQLite with FastAPI (multi-threaded)
connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session per request, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
