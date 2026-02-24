"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { JobStatus, JobStatusResponse } from "@/lib/types";
import { getJobStreamUrl, getJobStatus } from "@/lib/api";

interface CompletedPost {
  slug: string;
  title: string;
  images: number;
}

interface UseJobReturn {
  status: JobStatus | null;
  progress: number;
  total: number;
  currentPost: string | null;
  error: string | null;
  completedPosts: CompletedPost[];
  start: (jobId: string) => void;
}

export function useJob(): UseJobReturn {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPost, setCurrentPost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedPosts, setCompletedPosts] = useState<CompletedPost[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const data: JobStatusResponse = await getJobStatus(jobId);
          setStatus(data.status);
          setProgress(data.progress);
          setTotal(data.total);
          setCurrentPost(data.current_post);
          if (data.error) setError(data.error);
          if (data.status === "completed" || data.status === "failed") {
            cleanup();
          }
        } catch {
          // keep polling
        }
      }, 2000);
    },
    [cleanup]
  );

  const start = useCallback(
    (jobId: string) => {
      cleanup();
      setStatus("pending");
      setProgress(0);
      setError(null);
      setCompletedPosts([]);

      const url = getJobStreamUrl(jobId);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      const handleEvent = (eventType: string, data: string) => {
        try {
          const parsed = JSON.parse(data);

          switch (eventType) {
            case "status":
              setStatus(parsed.status);
              setProgress(parsed.progress);
              setTotal(parsed.total);
              setCurrentPost(parsed.current_post);
              if (parsed.error) setError(parsed.error);
              break;
            case "progress":
              setProgress(parsed.progress);
              setTotal(parsed.total);
              setCurrentPost(parsed.current_post);
              break;
            case "post_complete":
              setCompletedPosts((prev) => [
                ...prev,
                {
                  slug: parsed.slug,
                  title: parsed.title,
                  images: parsed.images,
                },
              ]);
              break;
            case "error":
              setError(parsed.message);
              break;
            case "done":
              cleanup();
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      // Listen for named events
      for (const eventType of [
        "status",
        "progress",
        "post_complete",
        "warning",
        "error",
        "done",
      ]) {
        es.addEventListener(eventType, (e) =>
          handleEvent(eventType, (e as MessageEvent).data)
        );
      }

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Fall back to polling
        startPolling(jobId);
      };
    },
    [cleanup, startPolling]
  );

  useEffect(() => cleanup, [cleanup]);

  return { status, progress, total, currentPost, error, completedPosts, start };
}
