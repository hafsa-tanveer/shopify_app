from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import health_check, scan
from .scheduler import schedule_daily_scans, scheduler

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    schedule_daily_scans()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Health Check Dashboard API", lifespan=lifespan)

# Dev-only: allow the Vite frontend (localhost:5173) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health_check.router)
app.include_router(scan.router)


@app.get("/")
def root():
    return {"status": "ok"}
