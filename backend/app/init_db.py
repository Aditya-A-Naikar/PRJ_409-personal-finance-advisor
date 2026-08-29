from app.database import Base, engine
from app import models  # noqa: F401 — side-effect import registers all models with Base


def init():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully.")
    print("   Tables:", list(Base.metadata.tables.keys()))


if __name__ == "__main__":
    init()
