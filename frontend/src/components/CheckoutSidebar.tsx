"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PostMetadata } from "@/lib/types";
import CookieInput from "./CookieInput";
import JobProgress from "./JobProgress";
import DownloadButton from "./DownloadButton";
import { JobStatus } from "@/lib/types";

interface CompletedPost {
  slug: string;
  title: string;
  images: number;
}

interface CheckoutSidebarProps {
  subdomain: string;
  posts: PostMetadata[];
  selectedSlugs: Set<string>;
  loading: boolean;
  cookie: string;
  onCookieChange: (v: string) => void;
  onGenerate: () => void;
  creating: boolean;
  // Job state
  jobId: string | null;
  jobStatus: JobStatus | null;
  jobProgress: number;
  jobTotal: number;
  jobCurrentPost: string | null;
  jobError: string | null;
  jobCompletedPosts: CompletedPost[];
  onStartOver: () => void;
}

export default function CheckoutSidebar({
  subdomain,
  posts,
  selectedSlugs,
  loading,
  cookie,
  onCookieChange,
  onGenerate,
  creating,
  jobId,
  jobStatus,
  jobProgress,
  jobTotal,
  jobCurrentPost,
  jobError,
  jobCompletedPosts,
  onStartOver,
}: CheckoutSidebarProps) {
  const selectedPosts = posts.filter((p) => selectedSlugs.has(p.slug));
  const paidCount = selectedPosts.filter((p) => p.audience === "only_paid").length;
  const totalWords = selectedPosts.reduce((sum, p) => sum + (p.word_count || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Generate EPUBs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Posts selected</span>
            <span className="font-medium">{selectedSlugs.size}</span>
          </div>
          {totalWords > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total words</span>
              <span className="font-medium">{totalWords.toLocaleString()}</span>
            </div>
          )}
          {paidCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid posts</span>
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {paidCount}
              </Badge>
            </div>
          )}

          <Separator />

          {!jobId && (
            <>
              <CookieInput value={cookie} onChange={onCookieChange} />
              <Button
                onClick={onGenerate}
                disabled={selectedSlugs.size === 0 || creating || loading}
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                {creating
                  ? "Starting..."
                  : selectedSlugs.size === 0
                  ? "Select posts to generate"
                  : `Generate ${selectedSlugs.size} EPUB${selectedSlugs.size !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}

          {jobId && (
            <div className="space-y-4">
              <JobProgress
                status={jobStatus}
                progress={jobProgress}
                total={jobTotal}
                currentPost={jobCurrentPost}
                error={jobError}
                completedPosts={jobCompletedPosts}
              />
              {jobStatus === "completed" && <DownloadButton jobId={jobId} />}
              {(jobStatus === "completed" || jobStatus === "failed") && (
                <Button variant="ghost" size="sm" onClick={onStartOver} className="w-full">
                  Start over
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPosts.length > 0 && !jobId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selected posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {selectedPosts.map((p) => (
                <div key={p.slug} className="text-sm truncate text-foreground">
                  {p.title}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
