"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PostMetadata } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import CookieInput from "./CookieInput";
import JobProgress from "./JobProgress";
import DownloadButton from "./DownloadButton";
import KindleEmailInput from "./KindleEmailInput";
import SendToKindleButton from "./SendToKindleButton";
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
  onDownload?: () => void;
  onKindleSent?: () => void;
  emailConfigured?: boolean;
  kindleEmail: string;
  onKindleEmailChange: (v: string) => void;
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
  onDownload,
  onKindleSent,
  emailConfigured,
  kindleEmail,
  onKindleEmailChange,
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
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                {paidCount}
              </Badge>
            </div>
          )}

          {paidCount > 0 && !cookie && (
            <div className="flex gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                You have {paidCount} paid post{paidCount !== 1 ? "s" : ""} selected. Without a session cookie, only free content will be fetched.
              </span>
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
              {jobStatus === "completed" && <DownloadButton jobId={jobId} onDownload={onDownload} />}
              {jobStatus === "completed" && emailConfigured && (
                <>
                  <Separator />
                  <KindleEmailInput value={kindleEmail} onChange={onKindleEmailChange} />
                  <SendToKindleButton jobId={jobId} kindleEmail={kindleEmail} onSent={onKindleSent} />
                </>
              )}
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
