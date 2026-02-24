import { PostListResponse, JobStatusResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function checkSubdomain(subdomain: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/newsletter/${subdomain}/check`);
    if (res.ok) return { exists: true };
    const body = await res.json().catch(() => ({}));
    return { exists: false, error: body.detail || `Newsletter not found` };
  } catch {
    return { exists: false, error: "Could not connect to server" };
  }
}

export async function fetchPosts(subdomain: string): Promise<PostListResponse> {
  const res = await fetch(`${API_BASE}/newsletter/${subdomain}/posts`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to fetch posts (${res.status})`);
  }
  return res.json();
}

export async function createJob(
  subdomain: string,
  slugs: string[],
  sessionCookie?: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subdomain,
      slugs,
      session_cookie: sessionCookie || null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to create job (${res.status})`);
  }
  const data = await res.json();
  return data.job_id;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

export function getJobStreamUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/stream`;
}

export function getJobDownloadUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/download`;
}

export function getPostsStreamUrl(subdomain: string): string {
  return `${API_BASE}/newsletter/${subdomain}/posts/stream`;
}
