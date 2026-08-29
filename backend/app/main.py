from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PRJ_409 Personal Finance Advisor",
    description="Backend API for the personal finance advisor application.",
    version="0.1.0",
)

# Allow the Vite dev server to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["System"])
def health():
    """Liveness probe — confirms the server is up."""
    return {"status": "ok", "message": "Backend is running"}
