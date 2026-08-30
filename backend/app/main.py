from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, admin_auth, transactions

app = FastAPI(
    title="PRJ_409 Personal Finance Advisor",
    description="Backend API for the personal finance advisor application.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_auth.router, prefix="/api/admin", tags=["admin-auth"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])


@app.get("/api/health", tags=["system"])
def health():
    """Liveness probe — confirms the server is up."""
    return {"status": "ok", "message": "Backend is running"}
