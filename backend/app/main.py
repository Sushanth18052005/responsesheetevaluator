"""FastAPI application entry point."""

import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CDN Response Sheet Evaluator starting up")
    if STATIC_DIR.exists():
        logger.info("Serving frontend from %s", STATIC_DIR)
    else:
        logger.warning("Frontend dist not found at %s — API-only mode", STATIC_DIR)
    yield
    logger.info("CDN Response Sheet Evaluator shutting down")


app = FastAPI(
    title="CDN Response Sheet Evaluator",
    description="Evaluate CDN3 response sheets against an answer key",
    version="1.0.0",
    lifespan=lifespan,
)

_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
_origins = [o.strip() for o in _origins if o.strip()]
_origins += [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cdn-response-evaluator"}


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file = STATIC_DIR / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")
