#!/usr/bin/env python3
"""
Re-fetch paid Substack posts using a session cookie, replacing truncated EPUBs.
"""

import os
import re
import time
import requests
from bs4 import BeautifulSoup
from ebooklib import epub

SUBSTACK_BASE = "https://samkriss.substack.com"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "epubs")
BATCH_SIZE = 50
DELAY_BETWEEN_REQUESTS = 1

SESSION_COOKIE = ""  # paste your substack.sid cookie value here

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def get_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    s.cookies.set("substack.sid", SESSION_COOKIE, domain=".substack.com")
    return s


def fetch_all_post_metadata(session):
    all_posts = []
    offset = 0
    while True:
        url = f"{SUBSTACK_BASE}/api/v1/archive?sort=new&search=&offset={offset}&limit={BATCH_SIZE}"
        print(f"Fetching metadata batch at offset {offset}...")
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        posts = resp.json()
        if not posts:
            break
        all_posts.extend(posts)
        print(f"  Got {len(posts)} posts (total so far: {len(all_posts)})")
        offset += len(posts)
        time.sleep(DELAY_BETWEEN_REQUESTS)
    return all_posts


def fetch_post_html(session, slug):
    url = f"{SUBSTACK_BASE}/p/{slug}"
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_article_content(html):
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

    for tag in body.find_all(["div", "section"], class_=re.compile(
        r"subscribe|share|footer|comment|sidebar|button-wrapper|paywall"
    )):
        tag.decompose()
    for tag in body.find_all(["script", "style", "iframe"]):
        tag.decompose()
    return body


def extract_subtitle(html):
    soup = BeautifulSoup(html, "html.parser")
    subtitle = soup.find("h3", class_=re.compile(r"subtitle"))
    if subtitle:
        return subtitle.get_text(strip=True)
    return None


def check_content_length(html):
    """Check the article body length to verify we got full content."""
    soup = BeautifulSoup(html, "html.parser")
    body = soup.find("div", class_="body")
    if not body:
        return 0
    return len(body.get_text())


def create_epub(title, author, date_str, content_html, subtitle=None, slug="post"):
    book = epub.EpubBook()
    identifier = f"samkriss-substack-{slug}"
    book.set_identifier(identifier)
    book.set_title(title)
    book.set_language("en")
    book.add_author(author)
    book.add_metadata("DC", "date", date_str)

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

    book.toc = [chapter]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav", chapter]

    date_prefix = date_str[:10] if date_str else "0000-00-00"
    safe_slug = re.sub(r'[^\w\-]', '_', slug)
    filename = f"{date_prefix}_{safe_slug}.epub"
    filepath = os.path.join(OUTPUT_DIR, filename)

    epub.write_epub(filepath, book)
    return filepath


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    session = get_session()

    # Test auth with a known paid post first
    print("Testing authentication with a paid post...")
    test_html = fetch_post_html(session, "prophecies-for-2026")
    content_len = check_content_length(test_html)
    print(f"  Test post content length: {content_len} chars")
    if content_len < 1000:
        print("ERROR: Session cookie doesn't seem to work — got very little content.")
        print("The cookie may have expired. Please grab a fresh one.")
        return
    else:
        print("Authentication working! Full content accessible.\n")

    # Fetch all metadata
    print("=" * 60)
    print("Fetching post metadata...")
    print("=" * 60)
    posts = fetch_all_post_metadata(session)
    print(f"\nFound {len(posts)} posts total.\n")

    # Filter to paid-only posts
    paid_posts = [p for p in posts if p.get("audience") == "only_paid"]
    print(f"Re-fetching {len(paid_posts)} paid posts with full content...\n")

    succeeded = 0
    failed = []
    still_paywalled = []

    for i, post in enumerate(paid_posts, 1):
        title = post.get("title", "Untitled")
        slug = post.get("slug", "")
        date_str = post.get("post_date", "")[:10]
        author = post.get("publishedBylines", [{}])
        if author:
            author = author[0].get("name", "Sam Kriss") if isinstance(author[0], dict) else "Sam Kriss"
        else:
            author = "Sam Kriss"

        print(f"[{i}/{len(paid_posts)}] Fetching: {title}...")

        try:
            html = fetch_post_html(session, slug)

            clen = check_content_length(html)
            if clen < 500:
                print(f"  WARNING: Very short content ({clen} chars) — may still be truncated")
                still_paywalled.append(title)

            content = extract_article_content(html)
            subtitle = extract_subtitle(html)

            if content is None:
                print(f"  WARNING: Could not extract content")
                failed.append((title, slug, "no content extracted"))
                continue

            # Overwrite the existing (truncated) epub
            filepath = create_epub(title, author, date_str, content, subtitle, slug)
            print(f"  -> {os.path.basename(filepath)}")
            succeeded += 1

        except Exception as e:
            print(f"  ERROR: {e}")
            failed.append((title, slug, str(e)))

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "=" * 60)
    print("DONE!")
    print(f"  Succeeded: {succeeded}")
    print(f"  Failed: {len(failed)}")
    if still_paywalled:
        print(f"  Still paywalled: {len(still_paywalled)}")
        for t in still_paywalled:
            print(f"    - {t}")
    if failed:
        print("\nFailed posts:")
        for title, slug, reason in failed:
            print(f"  - {title} ({slug}): {reason}")
    print(f"\nEPUBs saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
