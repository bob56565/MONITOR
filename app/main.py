from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, data, ai, reports, runs, part_a
from app.db.base import Base
from app.db.session import engine
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="MONITOR API",
    description="ISF/Specimen Inference MVP Backend",
    version="0.1.0",
    redirect_slashes=True,
)

# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

# Create tables on app startup
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # Allow failures in test environments
        pass

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MONITOR API"}

# Include routers
app.include_router(auth.router)
app.include_router(data.router)
app.include_router(ai.router)
app.include_router(reports.router)
app.include_router(runs.router)
app.include_router(part_a.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
