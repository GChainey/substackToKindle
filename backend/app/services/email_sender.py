"""
Send EPUBs to Kindle via email using the Resend API.
"""

from __future__ import annotations

import os
from typing import List

import resend


def is_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY"))


def send_to_kindle(
    kindle_email: str,
    epub_paths: List[str],
    subdomain: str,
) -> None:
    """Send EPUB files as email attachments to a Kindle email address."""
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("FROM_EMAIL", "kindle@resend.dev")

    if not api_key:
        raise RuntimeError("RESEND_API_KEY not configured")

    resend.api_key = api_key

    attachments = []
    for path in epub_paths:
        filename = os.path.basename(path)
        with open(path, "rb") as f:
            attachments.append(
                {
                    "filename": filename,
                    "content": list(f.read()),
                }
            )

    resend.Emails.send(
        {
            "from": from_email,
            "to": [kindle_email],
            "subject": f"Substack EPUBs: {subdomain}",
            "text": f"Attached: {len(epub_paths)} EPUB(s) from {subdomain}.substack.com",
            "attachments": attachments,
        }
    )
