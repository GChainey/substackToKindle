"use client";

import { JobStatus } from "@/lib/types";

interface CompletedPost {
  slug: string;
  title: string;
  images: number;
}

interface JobProgressProps {
  status: JobStatus | null;
  progress: number;
  total: number;
  currentPost: string | null;
  error: string | null;
  completedPosts: CompletedPost[];
}

export default function JobProgress({
  status,
  progress,
  total,
  currentPost,
  error,
  completedPosts,
}: JobProgressProps) {
  if (!status) return null;

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>
            {status === "completed"
              ? "Done!"
              : status === "failed"
              ? "Failed"
              : currentPost
              ? `Processing: ${currentPost}`
              : "Starting..."}
          </span>
          <span>
            {progress}/{total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              status === "failed"
                ? "bg-red-500"
                : status === "completed"
                ? "bg-green-500"
                : "bg-orange-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Completed posts log */}
      {completedPosts.length > 0 && (
        <div className="max-h-48 overflow-y-auto text-sm space-y-1">
          {completedPosts.map((p) => (
            <div key={p.slug} className="flex justify-between text-gray-600">
              <span className="truncate">{p.title}</span>
              <span className="text-gray-400 ml-2 shrink-0">
                {p.images} img{p.images !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
