"use client";

import { JobStatus } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
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
        <Progress value={pct} className="h-2" />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {completedPosts.length > 0 && (
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-3">
            {completedPosts.map((p) => (
              <div key={p.slug} className="flex justify-between text-sm py-1">
                <span className="truncate text-foreground">{p.title}</span>
                <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                  {p.images} img{p.images !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
