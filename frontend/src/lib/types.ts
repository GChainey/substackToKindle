export interface PostMetadata {
  title: string;
  slug: string;
  date: string;
  subtitle: string | null;
  audience: string | null;
  word_count: number | null;
}

export interface PostListResponse {
  subdomain: string;
  posts: PostMetadata[];
  total: number;
}

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  total: number;
  current_post: string | null;
  error: string | null;
}

export interface DeliveryRecord {
  id: string;
  timestamp: string;
  subdomain: string;
  postCount: number;
  postTitles: string[];
  method: "download" | "kindle";
  kindleEmail?: string;
  jobId: string;
}
