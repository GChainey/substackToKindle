#!/usr/bin/env python3
"""
Fetch all posts from Sam Kriss's Substack and create individual EPUBs
with embedded images. Requires session cookie for paid posts.
"""

import os
import re
import time
import hashlib
import mimetypes
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from ebooklib import epub

SUBSTACK_BASE = "https://samkriss.substack.com"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "epubs_v4")
BATCH_SIZE = 50
DELAY_BETWEEN_REQUESTS = 1

# Paste your substack.sid cookie value here
SESSION_COOKIE = ""  # paste your substack.sid cookie value here

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def get_session():
    s = requests.Session()
    s.headers.update(HEADERS)
    if SESSION_COOKIE:
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


def download_image(session, img_url):
    """Download an image and return (content_bytes, media_type, extension)."""
    try:
        resp = session.get(img_url, timeout=15)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
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

    # Convert Substack footnotes to local EPUB anchors
    # 1. Fix footnote anchors in body text (e.g. superscript "1" linking to footnote)
    for a in body.find_all("a", class_="footnote-anchor"):
        old_id = a.get("id", "")  # e.g. "footnote-anchor-1-184563652"
        # Extract footnote number
        num = a.get_text(strip=True)
        # Point href to the local footnote ID
        a["href"] = f"#footnote-{num}"
        a["id"] = f"footnote-anchor-{num}"
        # Remove external URL attributes
        for attr in ["data-component-name", "rel", "target"]:
            if a.has_attr(attr):
                del a[attr]
        # Make it superscript
        sup = body.find("sup") # just to check if already wrapped
        if a.parent and a.parent.name != "sup":
            # Wrap in superscript for proper footnote styling
            pass  # We'll handle via CSS

    # 2. Fix footnote sections at the bottom
    for div in body.find_all("div", class_="footnote"):
        # Find the footnote number link
        num_link = div.find("a", class_="footnote-number")
        if num_link:
            num = num_link.get_text(strip=True)
            # Point back to the anchor in the text
            num_link["href"] = f"#footnote-anchor-{num}"
            num_link["id"] = f"footnote-{num}"
            for attr in ["data-component-name", "rel", "target", "contenteditable"]:
                if num_link.has_attr(attr):
                    del num_link[attr]

    return body


def extract_subtitle(html):
    soup = BeautifulSoup(html, "html.parser")
    subtitle = soup.find("h3", class_=re.compile(r"subtitle"))
    if subtitle:
        return subtitle.get_text(strip=True)
    return None


def slug_from_title(title):
    """Create a filesystem-safe slug from a title."""
    s = title.lower().strip()
    s = re.sub(r'[^\w\s\-]', '', s)
    s = re.sub(r'[\s]+', '-', s)
    s = s.strip('-')
    # Truncate to avoid overly long filenames
    if len(s) > 80:
        s = s[:80].rsplit('-', 1)[0]
    return s


def create_epub_with_images(session, title, author, date_str, content_soup, subtitle=None, slug="post"):
    """Create an EPUB file with embedded images."""
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
img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
a { color: #1a5276; text-decoration: underline; }
.subtitle { font-style: italic; color: #555; margin-bottom: 1.5em; font-size: 1.1em; }
.date { color: #888; font-size: 0.9em; margin-bottom: 2em; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
figure { margin: 1em 0; text-align: center; }
figcaption { font-size: 0.85em; color: #666; margin-top: 0.5em; font-style: italic; }
.footnote-anchor { font-size: 0.75em; vertical-align: super; line-height: 0; text-decoration: none; }
.footnote { font-size: 0.85em; margin-top: 0.5em; padding-top: 0.5em; }
.footnote-number { text-decoration: none; font-weight: bold; margin-right: 0.3em; }
.footnote-content { display: inline; }
"""
    )
    book.add_item(css)

    # Unwrap all <picture> elements: replace with just the <img> inside
    for picture in content_soup.find_all("picture"):
        img = picture.find("img")
        if img:
            picture.replace_with(img)
        else:
            picture.decompose()

    # Remove all <source> tags (leftovers from picture elements)
    for source in content_soup.find_all("source"):
        source.decompose()

    # Download and embed all images
    img_count = 0
    for img_tag in content_soup.find_all("img"):
        src = img_tag.get("src", "")
        if not src:
            continue

        # Skip tracking pixels and tiny images
        width = img_tag.get("width", "")
        height = img_tag.get("height", "")
        if width and height:
            try:
                if int(float(width)) <= 1 or int(float(height)) <= 1:
                    continue
            except (ValueError, OverflowError):
                pass

        img_data, media_type, ext = download_image(session, src)
        if img_data is None:
            img_tag.decompose()
            continue

        img_count += 1
        img_filename = f"images/img_{img_count:03d}{ext}"

        img_item = epub.EpubItem(
            uid=f"img_{img_count}",
            file_name=img_filename,
            media_type=media_type,
            content=img_data,
        )
        book.add_item(img_item)

        # Clean the img tag: keep only src and alt
        alt_text = img_tag.get("alt", "")
        for attr in list(img_tag.attrs.keys()):
            del img_tag[attr]
        img_tag["src"] = img_filename
        if alt_text:
            img_tag["alt"] = alt_text

    # Build chapter HTML
    header_html = f"<h1>{title}</h1>\n"
    if subtitle:
        header_html += f'<p class="subtitle">{subtitle}</p>\n'
    header_html += f'<p class="date">{date_str}</p>\n'
    header_html += "<hr/>\n"

    chapter_content = header_html + str(content_soup)

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

    # Filename is just the title (no date prefix)
    file_slug = slug_from_title(title)
    filename = f"{file_slug}.epub"
    filepath = os.path.join(OUTPUT_DIR, filename)

    epub.write_epub(filepath, book)
    return filepath, img_count


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    session = get_session()

    # Test auth if cookie provided
    if SESSION_COOKIE:
        print("Testing authentication...")
        test_html = fetch_post_html(session, "prophecies-for-2026")
        soup = BeautifulSoup(test_html, "html.parser")
        body = soup.find("div", class_="body")
        if body and len(body.get_text()) > 1000:
            print("Authentication working!\n")
        else:
            print("WARNING: Cookie may not be working. Paid posts may be truncated.\n")
    else:
        print("No session cookie — paid posts will be truncated.\n")

    print("=" * 60)
    print("Fetching post metadata...")
    print("=" * 60)
    posts = fetch_all_post_metadata(session)
    print(f"\nFound {len(posts)} posts total.\n")

    succeeded = 0
    failed = []
    total_images = 0

    for i, post in enumerate(posts, 1):
        title = post.get("title", "Untitled")
        slug = post.get("slug", "")
        date_str = post.get("post_date", "")[:10]
        author = post.get("publishedBylines", [{}])
        if author:
            author = author[0].get("name", "Sam Kriss") if isinstance(author[0], dict) else "Sam Kriss"
        else:
            author = "Sam Kriss"

        print(f"[{i}/{len(posts)}] Fetching: {title}...")

        try:
            html = fetch_post_html(session, slug)
            content = extract_article_content(html)
            subtitle = extract_subtitle(html)

            if content is None:
                print(f"  WARNING: Could not extract content")
                failed.append((title, slug, "no content extracted"))
                continue

            filepath, img_count = create_epub_with_images(
                session, title, author, date_str, content, subtitle, slug
            )
            total_images += img_count
            print(f"  -> {os.path.basename(filepath)} ({img_count} images)")
            succeeded += 1

        except Exception as e:
            print(f"  ERROR: {e}")
            failed.append((title, slug, str(e)))

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print("\n" + "=" * 60)
    print("DONE!")
    print(f"  Succeeded: {succeeded}")
    print(f"  Total images embedded: {total_images}")
    print(f"  Failed: {len(failed)}")
    if failed:
        print("\nFailed posts:")
        for title, slug, reason in failed:
            print(f"  - {title} ({slug}): {reason}")
    print(f"\nEPUBs saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
