import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import (
    JobCreateRequest,
    JobCreateResponse,
    JobStatusResponse,
    SendToKindleRequest,
    SendToKindleResponse,
)
from app.services.job_manager import job_manager
from app.services.email_sender import is_configured as email_is_configured, send_to_kindle

router = APIRouter()


@router.post("/jobs", response_model=JobCreateResponse)
async def create_job(req: JobCreateRequest, background_tasks: BackgroundTasks):
    if not req.slugs:
        raise HTTPException(status_code=400, detail="No posts selected")

    job = job_manager.create_job(req.subdomain, req.slugs, req.session_cookie)
    background_tasks.add_task(job_manager.run_job, job)
    return JobCreateResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    d = job.status_dict()
    return JobStatusResponse(**d)


@router.get("/jobs/{job_id}/stream")
async def job_stream(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    queue: asyncio.Queue = asyncio.Queue()
    job.sse_queues.append(queue)

    async def event_generator():
        try:
            # Send current status immediately
            yield {"event": "status", "data": json.dumps(job.status_dict())}

            while True:
                msg = await asyncio.wait_for(queue.get(), timeout=60)
                yield {"event": msg["event"], "data": json.dumps(msg["data"])}
                if msg["event"] == "done":
                    break
        except asyncio.TimeoutError:
            yield {"event": "ping", "data": "{}"}
        finally:
            if queue in job.sse_queues:
                job.sse_queues.remove(queue)

    return EventSourceResponse(event_generator())


@router.get("/jobs/{job_id}/download")
async def download_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.zip_path:
        raise HTTPException(status_code=400, detail="No download available")

    return FileResponse(
        job.zip_path,
        media_type="application/zip",
        filename=f"{job.subdomain}_epubs.zip",
    )


@router.get("/email/status")
async def email_status():
    return {"configured": email_is_configured()}


@router.post("/jobs/{job_id}/send-to-kindle", response_model=SendToKindleResponse)
async def send_job_to_kindle(job_id: str, req: SendToKindleRequest):
    if not email_is_configured():
        raise HTTPException(status_code=503, detail="Email service not configured")

    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.epub_paths:
        raise HTTPException(status_code=400, detail="No EPUBs available")

    try:
        await asyncio.to_thread(send_to_kindle, req.kindle_email, job.epub_paths, job.subdomain)
        return SendToKindleResponse(success=True, message=f"Sent {len(job.epub_paths)} EPUB(s) to {req.kindle_email}")
    except Exception as e:
        return SendToKindleResponse(success=False, message="Failed to send", error=str(e))
