from __future__ import annotations

from pydantic import BaseModel
from enum import Enum
from typing import Optional, List


class PostMetadata(BaseModel):
    title: str
    slug: str
    date: str
    subtitle: Optional[str] = None
    audience: Optional[str] = None
    word_count: Optional[int] = None


class PostListResponse(BaseModel):
    subdomain: str
    posts: List[PostMetadata]
    total: int


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobCreateRequest(BaseModel):
    subdomain: str
    slugs: List[str]
    session_cookie: Optional[str] = None


class JobCreateResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int
    total: int
    current_post: Optional[str] = None
    error: Optional[str] = None


class SSEEvent(BaseModel):
    event: str
    data: dict


class SendToKindleRequest(BaseModel):
    kindle_email: str


class SendToKindleResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None
