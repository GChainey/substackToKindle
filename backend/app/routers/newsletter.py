import asyncio

import requests
from fastapi import APIRouter, HTTPException

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
