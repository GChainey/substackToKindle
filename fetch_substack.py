#!/usr/bin/env python3
"""
Fetch all posts from a Substack archive and create individual EPUBs.
Usage: python3 fetch_substack.py
"""

import os
import re
import sys
import json
import time
import requests
from bs4 import BeautifulSoup
from ebooklib import epub

SUBSTACK_BASE = "https://samkriss.substack.com"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "epubs")
BATCH_SIZE = 50
DELAY_BETWEEN_REQUESTS = 1  # seconds, be polite


def fetch_all_post_metadata():
    """Fetch all post metadata from the Substack archive API."""
    all_posts = []
    offset = 0

    while True:
        url = f"{SUBSTACK_BASE}/api/v1/archive?sort=new&search=&offset={offset}&limit={BATCH_SIZE}"
        print(f"Fetching metadata batch at offset {offset}...")
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        posts = resp.json()

        if not posts:
            break

        all_posts.extend(posts)
        print(f"  Got {len(posts)} posts (total so far: {len(all_posts)})")

        # Substack API returns variable batch sizes, so always advance
        # and only stop when we get zero results
        offset += len(posts)
        time.sleep(DELAY_BETWEEN_REQUESTS)

    return all_posts


def fetch_post_html(slug):
    """Fetch the full HTML of a single post."""
    url = f"{SUBSTACK_BASE}/p/{slug}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_article_content(html):
    """Extract the article body content from a Substack post page."""
    soup = BeautifulSoup(html, "html.parser")

    # Substack puts article content in a div with class "body markup"
    # or in the <article> tag, or in a div with data attribute
    body = soup.find("div", class_="body")
    if not body:
        body = soup.find("div", class_="available-content")
    if not body:
        body = soup.find("article")
    if not body:
        # Fallback: look for the post body in common Substack markup
        body = soup.find("div", {"class": re.compile(r"post-content|entry-content")})

    if not body:
        return None

    # Clean up: remove subscribe buttons, share buttons, etc.
    for tag in body.find_all(["div", "section"], class_=re.compile(
        r"subscribe|share|footer|comment|sidebar|button-wrapper|paywall"
    )):
        tag.decompose()

    # Remove script and style tags
    for tag in body.find_all(["script", "style", "iframe"]):
        tag.decompose()

    return body


def extract_subtitle(html):
    """Extract subtitle if present."""
    soup = BeautifulSoup(html, "html.parser")
    subtitle = soup.find("h3", class_=re.compile(r"subtitle"))
    if subtitle:
        return subtitle.get_text(strip=True)
    return None


def create_epub(title, author, date_str, content_html, subtitle=None, slug="post"):
    """Create an EPUB file from article content."""
    book = epub.EpubBook()

    # Metadata
    safe_title = re.sub(r'[^\w\s\-]', '', title).strip()
    identifier = f"samkriss-substack-{slug}"
    book.set_identifier(identifier)
    book.set_title(title)
    book.set_language("en")
    book.add_author(author)

    # Add metadata for date
    book.add_metadata("DC", "date", date_str)

    # Basic CSS for readable formatting
    css = epub.EpubItem(
        uid="style",
        file_name="style/default.css",
        media_type="text/css",
        content=b"""
body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 1em;
    color: #222;
}
h1, h2, h3, h4 {
    font-family: Georgia, serif;
    line-height: 1.3;
    margin-top: 1.5em;
}
h1 { font-size: 1.8em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
p { margin: 0.8em 0; text-indent: 0; }
blockquote {
    margin: 1em 2em;
    padding-left: 1em;
    border-left: 3px solid #ccc;
    font-style: italic;
}
img { max-width: 100%; height: auto; }
a { color: #1a5276; text-decoration: underline; }
.subtitle { font-style: italic; color: #555; margin-bottom: 1.5em; font-size: 1.1em; }
.date { color: #888; font-size: 0.9em; margin-bottom: 2em; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
"""
    )
    book.add_item(css)

    # Build chapter HTML
    header_html = f"<h1>{title}</h1>\n"
    if subtitle:
        header_html += f'<p class="subtitle">{subtitle}</p>\n'
    header_html += f'<p class="date">{date_str}</p>\n'
    header_html += "<hr/>\n"

    chapter_content = header_html + str(content_html)

    chapter = epub.EpubHtml(
        title=title,
        file_name="content.xhtml",
        lang="en",
        content=chapter_content,
    )
    chapter.add_item(css)
    book.add_item(chapter)

    # Table of contents and spine
    book.toc = [chapter]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav", chapter]

    # Write file
    # Use date prefix for easy sorting on Kindle
    date_prefix = date_str[:10] if date_str else "0000-00-00"
    safe_slug = re.sub(r'[^\w\-]', '_', slug)
    filename = f"{date_prefix}_{safe_slug}.epub"
    filepath = os.path.join(OUTPUT_DIR, filename)

    epub.write_epub(filepath, book)
    return filepath


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Get all post metadata
    print("=" * 60)
    print("Fetching post metadata from Substack archive...")
    print("=" * 60)
    posts = fetch_all_post_metadata()
    print(f"\nFound {len(posts)} posts total.\n")

    # Step 2: Process each post
    succeeded = 0
    failed = []
    skipped = 0

    for i, post in enumerate(posts, 1):
        title = post.get("title", "Untitled")
        slug = post.get("slug", "")
        date_str = post.get("post_date", "")[:10]
        author = post.get("publishedBylines", [{}])
        if author:
            author = author[0].get("name", "Sam Kriss") if isinstance(author[0], dict) else "Sam Kriss"
        else:
            author = "Sam Kriss"

        # Check if already exists
        safe_slug = re.sub(r'[^\w\-]', '_', slug)
        expected_file = os.path.join(OUTPUT_DIR, f"{date_str}_{safe_slug}.epub")
        if os.path.exists(expected_file):
            print(f"[{i}/{len(posts)}] SKIP (exists): {title}")
            skipped += 1
            continue

        print(f"[{i}/{len(posts)}] Fetching: {title}...")

        try:
            html = fetch_post_html(slug)
            content = extract_article_content(html)
            subtitle = extract_subtitle(html)

            if content is None:
                print(f"  WARNING: Could not extract content (may be paywalled)")
                failed.append((title, slug, "no content extracted"))
                continue

            filepath = create_epub(title, author, date_str, content, subtitle, slug)
            print(f"  -> {os.path.basename(filepath)}")
            succeeded += 1

        except Exception as e:
            print(f"  ERROR: {e}")
            failed.append((title, slug, str(e)))

        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Summary
    print("\n" + "=" * 60)
    print("DONE!")
    print(f"  Succeeded: {succeeded}")
    print(f"  Skipped (already exist): {skipped}")
    print(f"  Failed: {len(failed)}")
    if failed:
        print("\nFailed posts:")
        for title, slug, reason in failed:
            print(f"  - {title} ({slug}): {reason}")
    print(f"\nEPUBs saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
