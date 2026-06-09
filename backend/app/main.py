from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings, logger
from app.routes import analyze, tailor, evaluate, interview

app = FastAPI(
    title="AI Resume Analyzer & Interview Coach API",
    description="FastAPI Backend powered by Gemini 2.5 and Firestore for resume matching, tailoring, and conversational coaching.",
    version="1.0.0"
)

# Configure CORS Middleware
# Allows the Next.js frontend (typically at localhost:3000) to request API endpoints directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domains, e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base health check route
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "model": "gemini-2.5-flash",
        "api_version": "1.0.0"
    }

# Combine API routes under /api
api_router = APIRouter(prefix="/api")
api_router.include_router(analyze.router, tags=["Resume Analysis"])
api_router.include_router(tailor.router, tags=["Resume Tailoring"])
api_router.include_router(evaluate.router, tags=["Evaluation"])
api_router.include_router(interview.router, tags=["Conversational Interview"])

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI Server starting up on http://localhost:8000")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI Server shutting down...")
