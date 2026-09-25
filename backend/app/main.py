from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, admin_auth, transactions, recurring, budget, goals, affordability, dashboard

app = FastAPI(
    title="ArthaSense — AI Personal Finance Advisor",
    description="Backend API for the ArthaSense intelligent personal finance application.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,           prefix="/api/auth",           tags=["auth"])
app.include_router(admin_auth.router,     prefix="/api/admin",          tags=["admin-auth"])
app.include_router(transactions.router,   prefix="/api/transactions",    tags=["transactions"])
app.include_router(recurring.router,      prefix="/api/recurring",       tags=["recurring"])
app.include_router(budget.router,         prefix="/api/budget",          tags=["budget"])
app.include_router(goals.router,          prefix="/api/goals",           tags=["goals"])
app.include_router(affordability.router,  prefix="/api/affordability",   tags=["affordability"])
app.include_router(dashboard.router,      prefix="/api/dashboard",       tags=["dashboard"])


@app.get("/api/health", tags=["system"])
def health():
    """Liveness probe — confirms the server is up."""
    return {"status": "ok", "message": "Backend is running"}
