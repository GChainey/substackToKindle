from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import newsletter, jobs
from app.services.job_manager import job_manager

app = FastAPI(title="Substack to Kindle", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(newsletter.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")


@app.on_event("startup")
async def startup():
    job_manager.start_cleanup_task()


@app.on_event("shutdown")
async def shutdown():
    job_manager.stop_cleanup_task()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
