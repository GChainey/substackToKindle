"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PostMetadata } from "@/lib/types";
import { fetchPosts, createJob } from "@/lib/api";
import { useJob } from "@/hooks/useJob";
import PostList from "@/components/PostList";
import CookieInput from "@/components/CookieInput";
import JobProgress from "@/components/JobProgress";
import DownloadButton from "@/components/DownloadButton";

export default function NewsletterPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;

  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [cookie, setCookie] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const job = useJob();

  useEffect(() => {
    fetchPosts(subdomain)
      .then((data) => {
        setPosts(data.posts);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, [subdomain]);

  const handleToggle = useCallback((slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedSlugs(new Set(posts.map((p) => p.slug)));
  }, [posts]);

  const handleDeselectAll = useCallback(() => {
    setSelectedSlugs(new Set());
  }, []);

  async function handleGenerate() {
    if (selectedSlugs.size === 0) return;
    setCreating(true);
    try {
      const id = await createJob(
        subdomain,
        Array.from(selectedSlugs),
        cookie || undefined
      );
      setJobId(id);
      job.start(id);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to start job");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-500">Loading posts from {subdomain}.substack.com...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="text-red-500">{fetchError}</div>
        <a href="/" className="text-orange-600 hover:underline">
          Try another newsletter
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{subdomain}</h1>
        <p className="text-gray-500">{posts.length} posts found</p>
      </div>

      {!jobId && (
        <>
          <PostList
            posts={posts}
            selectedSlugs={selectedSlugs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />

          <CookieInput value={cookie} onChange={setCookie} />

          <button
            onClick={handleGenerate}
            disabled={selectedSlugs.size === 0 || creating}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating
              ? "Starting..."
              : `Generate ${selectedSlugs.size} EPUB${selectedSlugs.size !== 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {jobId && (
        <div className="space-y-6">
          <JobProgress
            status={job.status}
            progress={job.progress}
            total={job.total}
            currentPost={job.currentPost}
            error={job.error}
            completedPosts={job.completedPosts}
          />

          {job.status === "completed" && <DownloadButton jobId={jobId} />}

          {(job.status === "completed" || job.status === "failed") && (
            <button
              onClick={() => {
                setJobId(null);
                setSelectedSlugs(new Set());
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}
