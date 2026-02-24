"""
Substack API client — parameterized version of the proven logic from fetch_all.py.
"""

from __future__ import annotations

import re
import time
from typing import Optional, Tuple, List

import requests
from bs4 import BeautifulSoup

BATCH_SIZE = 50
DELAY_BETWEEN_REQUESTS = 1.5
MAX_RETRIES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


class SubstackClient:
    @staticmethod
    def _headers() -> dict:
        return dict(HEADERS)

    def __init__(self, subdomain: str, session_cookie: Optional[str] = None):
        self.subdomain = subdomain
        self.base_url = f"https://{subdomain}.substack.com"
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        if session_cookie:
            self.session.cookies.set(
                "substack.sid", session_cookie, domain=".substack.com"
            )

    def fetch_all_post_metadata(self) -> List[dict]:
        all_posts = []
        for batch in self.fetch_post_metadata_batches():
            all_posts.extend(batch)
        return all_posts

    def _get_with_retry(self, url: str, timeout: int = 30) -> requests.Response:
        """GET with exponential backoff on 429 rate limits."""
        for attempt in range(MAX_RETRIES):
            resp = self.session.get(url, timeout=timeout)
            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp
        # Final attempt — let it raise
        resp = self.session.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp

    def fetch_post_metadata_batches(self):
        """Yield batches of post metadata as they're fetched from the API."""
        offset = 0
        while True:
            url = (
                f"{self.base_url}/api/v1/archive"
                f"?sort=new&search=&offset={offset}&limit={BATCH_SIZE}"
            )
            resp = self._get_with_retry(url)
            posts = resp.json()
            if not posts:
                break
            yield posts
            offset += len(posts)
            time.sleep(DELAY_BETWEEN_REQUESTS)

    def fetch_post_html(self, slug: str) -> str:
        url = f"{self.base_url}/p/{slug}"
        resp = self._get_with_retry(url)
        return resp.text

    def download_image(self, img_url: str) -> Tuple[Optional[bytes], Optional[str], Optional[str]]:
        try:
            resp = self._get_with_retry(img_url, timeout=15)
            content_type = (
                resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            )
            ext_map = {
                "image/jpeg": ".jpg",
                "image/png": ".png",
                "image/gif": ".gif",
                "image/webp": ".webp",
                "image/svg+xml": ".svg",
            }
            ext = ext_map.get(content_type, ".jpg")
            return resp.content, content_type, ext
        except Exception:
            return None, None, None

    @staticmethod
    def extract_article_content(html: str) -> Optional[BeautifulSoup]:
        soup = BeautifulSoup(html, "html.parser")
        body = soup.find("div", class_="body")
        if not body:
            body = soup.find("div", class_="available-content")
        if not body:
            body = soup.find("article")
        if not body:
            body = soup.find("div", {"class": re.compile(r"post-content|entry-content")})
        if not body:
            return None

        for tag in body.find_all(
            ["div", "section"],
            class_=re.compile(
                r"subscribe|share|footer|comment|sidebar|button-wrapper|paywall"
            ),
        ):
            tag.decompose()
        for tag in body.find_all(["script", "style", "iframe"]):
            tag.decompose()

        # Convert Substack footnotes to local EPUB anchors
        for a in body.find_all("a", class_="footnote-anchor"):
            num = a.get_text(strip=True)
            a["href"] = f"#footnote-{num}"
            a["id"] = f"footnote-anchor-{num}"
            for attr in ["data-component-name", "rel", "target"]:
                if a.has_attr(attr):
                    del a[attr]

        for div in body.find_all("div", class_="footnote"):
            num_link = div.find("a", class_="footnote-number")
            if num_link:
                num = num_link.get_text(strip=True)
                num_link["href"] = f"#footnote-anchor-{num}"
                num_link["id"] = f"footnote-{num}"
                for attr in [
                    "data-component-name",
                    "rel",
                    "target",
                    "contenteditable",
                ]:
                    if num_link.has_attr(attr):
                        del num_link[attr]

        return body

    @staticmethod
    def extract_subtitle(html: str) -> Optional[str]:
        soup = BeautifulSoup(html, "html.parser")
        subtitle = soup.find("h3", class_=re.compile(r"subtitle"))
        if subtitle:
            return subtitle.get_text(strip=True)
        return None

    @staticmethod
    def extract_post_metadata(post: dict) -> dict:
        """Extract normalized metadata from a Substack API post object."""
        authors = post.get("publishedBylines", [])
        if authors and isinstance(authors[0], dict):
            author = authors[0].get("name", "Unknown")
        else:
            author = "Unknown"

        return {
            "title": post.get("title", "Untitled"),
            "slug": post.get("slug", ""),
            "date": post.get("post_date", "")[:10],
            "subtitle": post.get("subtitle"),
            "audience": post.get("audience"),
            "word_count": post.get("wordcount"),
            "author": author,
        }
