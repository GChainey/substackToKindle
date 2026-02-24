"""
EPUB builder — extracted from fetch_all.py's create_epub_with_images.
"""

from __future__ import annotations

import os
import re
from typing import Optional, Tuple

from bs4 import BeautifulSoup
from ebooklib import epub

from app.services.substack import SubstackClient

EPUB_CSS = b"""
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


def slug_from_title(title: str) -> str:
    s = title.lower().strip()
    s = re.sub(r"[^\w\s\-]", "", s)
    s = re.sub(r"[\s]+", "-", s)
    s = s.strip("-")
    if len(s) > 80:
        s = s[:80].rsplit("-", 1)[0]
    return s


def build_epub(
    client: SubstackClient,
    title: str,
    author: str,
    date_str: str,
    content_soup: BeautifulSoup,
    output_dir: str,
    subtitle: Optional[str] = None,
    slug: str = "post",
) -> Tuple[str, int]:
    """
    Build an EPUB file with embedded images. Returns (filepath, image_count).
    """
    book = epub.EpubBook()

    identifier = f"substack-{client.subdomain}-{slug}"
    book.set_identifier(identifier)
    book.set_title(title)
    book.set_language("en")
    book.add_author(author)
    book.add_metadata("DC", "date", date_str)

    css = epub.EpubItem(
        uid="style",
        file_name="style/default.css",
        media_type="text/css",
        content=EPUB_CSS,
    )
    book.add_item(css)

    # Unwrap <picture> elements
    for picture in content_soup.find_all("picture"):
        img = picture.find("img")
        if img:
            picture.replace_with(img)
        else:
            picture.decompose()

    for source in content_soup.find_all("source"):
        source.decompose()

    # Download and embed images
    img_count = 0
    for img_tag in content_soup.find_all("img"):
        src = img_tag.get("src", "")
        if not src:
            continue

        width = img_tag.get("width", "")
        height = img_tag.get("height", "")
        if width and height:
            try:
                if int(float(width)) <= 1 or int(float(height)) <= 1:
                    continue
            except (ValueError, OverflowError):
                pass

        img_data, media_type, ext = client.download_image(src)
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

        alt_text = img_tag.get("alt", "")
        for attr in list(img_tag.attrs.keys()):
            del img_tag[attr]
        img_tag["src"] = img_filename
        if alt_text:
            img_tag["alt"] = alt_text

    # Build chapter
    header_html = f"<h1>{title}</h1>\n"
    if subtitle:
        header_html += f'<p class="subtitle">{subtitle}</p>\n'
    header_html += f'<p class="date">{date_str}</p>\n'
    header_html += "<hr/>\n"

    chapter = epub.EpubHtml(
        title=title,
        file_name="content.xhtml",
        lang="en",
        content=header_html + str(content_soup),
    )
    chapter.add_item(css)
    book.add_item(chapter)

    book.toc = [chapter]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = ["nav", chapter]

    file_slug = slug_from_title(title)
    filename = f"{file_slug}.epub"
    filepath = os.path.join(output_dir, filename)

    epub.write_epub(filepath, book)
    return filepath, img_count
