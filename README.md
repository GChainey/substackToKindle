# Substack to Kindle

Convert any Substack newsletter into Kindle-ready EPUBs with embedded images and footnotes.

## Quick Start

### Without Docker

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### With Docker

```bash
docker compose up
```

## Usage

1. Enter a Substack URL (e.g. `samkriss.substack.com`) on the home page
2. Browse and select posts to convert
3. Optionally provide your `substack.sid` cookie for paid content access
4. Click "Generate EPUBs" and watch the progress
5. Download the ZIP file containing your EPUBs

## Paid Content

To access paid posts, you need your session cookie:

1. Log into your Substack subscription in a browser
2. Open DevTools (F12) → Application → Cookies
3. Copy the value of `substack.sid`
4. Paste it in the "I have a paid subscription" section

The cookie is only used in-memory for your request and never stored.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/newsletter/{subdomain}/posts` | Fetch post metadata |
| POST | `/api/jobs` | Create EPUB generation job |
| GET | `/api/jobs/{id}` | Poll job status |
| GET | `/api/jobs/{id}/stream` | SSE progress events |
| GET | `/api/jobs/{id}/download` | Download ZIP |
