import asyncio
import json

import requests
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import PostMetadata, PostListResponse
from app.services.substack import SubstackClient

router = APIRouter()


@router.get("/newsletter/{subdomain}/check")
async def check_subdomain(subdomain: str):
    """Quick check that a Substack subdomain exists (fetches first batch only)."""
    def _check():
        resp = requests.get(
            f"https://{subdomain}.substack.com/api/v1/archive?sort=new&offset=0&limit=1",
            headers=SubstackClient._headers(),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    try:
        posts = await asyncio.to_thread(_check)
    except requests.exceptions.HTTPError:
        raise HTTPException(status_code=404, detail=f"Newsletter '{subdomain}' not found")
    except Exception:
        raise HTTPException(status_code=502, detail=f"Could not reach {subdomain}.substack.com")

    return {"subdomain": subdomain, "exists": True, "sample_title": posts[0].get("title") if posts else None}


@router.get("/newsletter/{subdomain}/posts/stream")
async def stream_posts(subdomain: str):
    """Stream post metadata as it's fetched batch-by-batch via SSE."""
    client = SubstackClient(subdomain)

    async def event_generator():
        total = 0
        batch_num = 0
        try:
            for batch in client.fetch_post_metadata_batches():
                batch_num += 1
                posts = []
                for p in batch:
                    meta = SubstackClient.extract_post_metadata(p)
                    posts.append({
                        "title": meta["title"],
                        "slug": meta["slug"],
                        "date": meta["date"],
                        "subtitle": meta.get("subtitle"),
                        "audience": meta.get("audience"),
                        "word_count": meta.get("word_count"),
                    })
                total += len(posts)
                yield {
                    "event": "batch",
                    "data": json.dumps({
                        "batch": batch_num,
                        "batch_size": len(posts),
                        "total_so_far": total,
                        "posts": posts,
                    }),
                }
                # Yield control to event loop between batches
                await asyncio.sleep(0)

            yield {
                "event": "done",
                "data": json.dumps({"total": total}),
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"message": str(e)}),
            }

    return EventSourceResponse(event_generator())


@router.get("/newsletter/{subdomain}/posts", response_model=PostListResponse)
async def get_posts(subdomain: str):
    client = SubstackClient(subdomain)
    try:
        raw_posts = await asyncio.to_thread(client.fetch_all_post_metadata)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from Substack: {e}")

    posts = []
    for p in raw_posts:
        meta = SubstackClient.extract_post_metadata(p)
        posts.append(
            PostMetadata(
                title=meta["title"],
                slug=meta["slug"],
                date=meta["date"],
                subtitle=meta.get("subtitle"),
                audience=meta.get("audience"),
                word_count=meta.get("word_count"),
            )
        )

    return PostListResponse(subdomain=subdomain, posts=posts, total=len(posts))
