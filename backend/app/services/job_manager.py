"""
Background job orchestration for EPUB generation with SSE progress events.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict

from bs4 import BeautifulSoup

from app.services.substack import SubstackClient
from app.services.epub_builder import build_epub


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Job:
    id: str
    subdomain: str
    slugs: List[str]
    session_cookie: Optional[str] = None
    status: JobStatus = JobStatus.PENDING
    progress: int = 0
    total: int = 0
    current_post: Optional[str] = None
    error: Optional[str] = None
    output_dir: Optional[str] = None
    zip_path: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    sse_queues: List[asyncio.Queue] = field(default_factory=list)

    def push_event(self, event: str, data: dict):
        for q in self.sse_queues:
            q.put_nowait({"event": event, "data": data})

    def status_dict(self) -> dict:
        return {
            "job_id": self.id,
            "status": self.status.value,
            "progress": self.progress,
            "total": self.total,
            "current_post": self.current_post,
            "error": self.error,
        }


class JobManager:
    JOB_TTL = 3600  # 1 hour

    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    def create_job(
        self,
        subdomain: str,
        slugs: List[str],
        session_cookie: Optional[str] = None,
    ) -> Job:
        job_id = uuid.uuid4().hex[:12]
        output_dir = tempfile.mkdtemp(prefix=f"stk_{job_id}_")
        job = Job(
            id=job_id,
            subdomain=subdomain,
            slugs=slugs,
            session_cookie=session_cookie,
            total=len(slugs),
            output_dir=output_dir,
        )
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    async def run_job(self, job: Job):
        job.status = JobStatus.RUNNING
        job.push_event("status", job.status_dict())

        client = SubstackClient(job.subdomain, job.session_cookie)
        epub_files: List[str] = []

        try:
            for i, slug in enumerate(job.slugs):
                job.current_post = slug
                job.progress = i
                job.push_event("progress", job.status_dict())

                # Run blocking I/O in a thread
                html = await asyncio.to_thread(client.fetch_post_html, slug)
                content = SubstackClient.extract_article_content(html)
                subtitle = SubstackClient.extract_subtitle(html)

                if content is None:
                    job.push_event(
                        "warning",
                        {"slug": slug, "message": "Could not extract content"},
                    )
                    continue

                # Get metadata from HTML
                soup_for_title = BeautifulSoup(html, "html.parser")
                title_tag = soup_for_title.find(
                    "h1", class_=lambda c: c and "post-title" in c
                )
                title = title_tag.get_text(strip=True) if title_tag else slug

                author_meta = soup_for_title.find("meta", {"name": "author"})
                author = (
                    author_meta["content"]
                    if author_meta and author_meta.get("content")
                    else "Unknown"
                )

                time_tag = soup_for_title.find("time")
                date_str = ""
                if time_tag and time_tag.get("datetime"):
                    date_str = time_tag["datetime"][:10]

                filepath, img_count = await asyncio.to_thread(
                    build_epub,
                    client,
                    title,
                    author,
                    date_str,
                    content,
                    job.output_dir,
                    subtitle,
                    slug,
                )
                epub_files.append(filepath)
                job.push_event(
                    "post_complete",
                    {"slug": slug, "title": title, "images": img_count},
                )

            # Create ZIP
            job.progress = job.total
            job.current_post = None
            if epub_files:
                zip_base = os.path.join(job.output_dir, f"{job.subdomain}_epubs")
                job.zip_path = shutil.make_archive(zip_base, "zip", job.output_dir)

            job.status = JobStatus.COMPLETED
            job.push_event("status", job.status_dict())

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.push_event("error", {"message": str(e)})
            job.push_event("status", job.status_dict())

        # Signal end of stream
        job.push_event("done", {})

    def start_cleanup_task(self):
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    def stop_cleanup_task(self):
        if self._cleanup_task:
            self._cleanup_task.cancel()

    async def _cleanup_loop(self):
        while True:
            await asyncio.sleep(300)  # Check every 5 minutes
            now = time.time()
            expired = [
                jid
                for jid, job in self.jobs.items()
                if now - job.created_at > self.JOB_TTL
            ]
            for jid in expired:
                job = self.jobs.pop(jid, None)
                if job and job.output_dir and os.path.exists(job.output_dir):
                    shutil.rmtree(job.output_dir, ignore_errors=True)


# Singleton
job_manager = JobManager()
