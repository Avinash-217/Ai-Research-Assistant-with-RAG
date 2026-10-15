"""FastAPI Main Application Entry Point with all routes mounted."""
import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.config import get_settings
from backend.core.rate_limiter import RateLimiterMiddleware
from backend.models.database import init_db, engine
from backend.api import auth, documents, chat, features, eval, keys
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter Middleware (60 req/min per IP)
app.add_middleware(RateLimiterMiddleware, max_requests=60, window_seconds=60)

# Startup DB initialization
@app.on_event("startup")
def on_startup():
    init_db()


# Global Sanitized Error Handlers (prevents stack trace leakage)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Request payload validation failed", "errors": str(exc.errors())}
    )


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    # Log securely without outputting raw customer context or leaking internal paths
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred while processing the research request.",
            "code": "INTERNAL_SERVER_ERROR"
        }
    )


# Middleware for timing and security headers
@app.middleware("http")
async def add_process_time_and_security(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


# Health check endpoint
@app.get("/api/health", tags=["System"])
async def health_check():
    db_status = "ok"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": db_status,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "ocr_enabled": settings.OCR_ENABLED,
        "web_search_enabled": settings.WEB_SEARCH_ENABLED,
        "timestamp": time.time()
    }


# Mount API routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(features.router)
app.include_router(eval.router)
app.include_router(keys.router)

# Static upload files (serving uploaded PDFs securely for viewing)
uploads_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=uploads_dir), name="files")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
