"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PostMetadata } from "@/lib/types";
import { createJob, getPostsStreamUrl, getEmailStatus } from "@/lib/api";
import { useJob } from "@/hooks/useJob";
import { useDeliveryHistory } from "@/hooks/useDeliveryHistory";
import { useVariant } from "@/components/VariantSwitcher";
import PostList from "@/components/PostList";
import CookieInput from "@/components/CookieInput";
import JobProgress from "@/components/JobProgress";
import DownloadButton from "@/components/DownloadButton";
import KindleEmailInput from "@/components/KindleEmailInput";
import SendToKindleButton from "@/components/SendToKindleButton";
import CheckoutSidebar from "@/components/CheckoutSidebar";
import DeliveryHistory from "@/components/DeliveryHistory";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";

export default function NewsletterPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;
  const { variant } = useVariant();

  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [loadingBatch, setLoadingBatch] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [cookie, setCookie] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [kindleEmail, setKindleEmail] = useState("");

  const job = useJob();
  const { records: historyRecords, addRecord, clearHistory } = useDeliveryHistory(subdomain);

  useEffect(() => {
    getEmailStatus().then((s) => setEmailConfigured(s.configured));
  }, []);

  const recordKindleSent = useCallback(() => {
    if (!jobId) return;
    const selectedPosts = posts.filter((p) => selectedSlugs.has(p.slug));
    addRecord({
      subdomain,
      postCount: selectedPosts.length,
      postTitles: selectedPosts.map((p) => p.title),
      method: "kindle",
      kindleEmail,
      jobId,
    });
  }, [jobId, posts, selectedSlugs, subdomain, kindleEmail, addRecord]);

  const recordDownload = useCallback(() => {
    if (!jobId) return;
    const selectedPosts = posts.filter((p) => selectedSlugs.has(p.slug));
    addRecord({
      subdomain,
      postCount: selectedPosts.length,
      postTitles: selectedPosts.map((p) => p.title),
      method: "download",
      jobId,
    });
  }, [jobId, posts, selectedSlugs, subdomain, addRecord]);

  useEffect(() => {
    const url = getPostsStreamUrl(subdomain);
    const es = new EventSource(url);
    const accumulated: PostMetadata[] = [];

    es.addEventListener("batch", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        const newPosts: PostMetadata[] = data.posts;
        accumulated.push(...newPosts);
        setPosts([...accumulated]);
        setLoadingTotal(data.total_so_far);
        setLoadingBatch(data.batch);
      } catch { /* ignore */ }
    });

    es.addEventListener("done", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setLoadingTotal(data.total);
      } catch { /* ignore */ }
      setLoading(false);
      es.close();
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setFetchError(data.message || "Failed to fetch posts");
      } catch {
        if (accumulated.length === 0) {
          setFetchError("Failed to connect to server");
        }
      }
      setLoading(false);
      es.close();
    });

    es.onerror = () => {
      if (accumulated.length === 0) {
        setFetchError("Failed to connect to server");
        setLoading(false);
      }
      es.close();
    };

    return () => es.close();
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
      const id = await createJob(subdomain, Array.from(selectedSlugs), cookie || undefined);
      setJobId(id);
      job.start(id);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to start job");
    } finally {
      setCreating(false);
    }
  }

  function handleStartOver() {
    setJobId(null);
    setSelectedSlugs(new Set());
  }

  if (fetchError && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="text-destructive">{fetchError}</div>
        <a href="/" className="text-orange-600 hover:underline">
          Try another newsletter
        </a>
      </div>
    );
  }

  const loadingIndicator = loading && (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">
          {loadingTotal > 0
            ? `Loaded ${loadingTotal} posts (batch ${loadingBatch})...`
            : "Connecting to Substack..."}
        </span>
      </div>
      {loadingTotal > 0 && <Progress value={100} className="h-1" />}
    </div>
  );

  // ─── Variant: Two-Column Checkout ────────────────────────────
  if (variant === "checkout") {
    return (
      <div className="flex gap-8">
        {/* Left: Post list */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{subdomain}</h1>
            {loading ? loadingIndicator : (
              <p className="text-sm text-muted-foreground">{posts.length} posts found</p>
            )}
          </div>

          {posts.length > 0 && (
            <PostList
              posts={posts}
              selectedSlugs={selectedSlugs}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              maxHeight="calc(100vh - 220px)"
            />
          )}
        </div>

        {/* Right: Checkout sidebar */}
        <div className="w-80 shrink-0">
          <div className="sticky top-8">
            <CheckoutSidebar
              subdomain={subdomain}
              posts={posts}
              selectedSlugs={selectedSlugs}
              loading={loading}
              cookie={cookie}
              onCookieChange={setCookie}
              onGenerate={handleGenerate}
              creating={creating}
              jobId={jobId}
              jobStatus={job.status}
              jobProgress={job.progress}
              jobTotal={job.total}
              jobCurrentPost={job.currentPost}
              jobError={job.error}
              jobCompletedPosts={job.completedPosts}
              onStartOver={handleStartOver}
              onDownload={recordDownload}
              onKindleSent={recordKindleSent}
              emailConfigured={emailConfigured}
              kindleEmail={kindleEmail}
              onKindleEmailChange={setKindleEmail}
            />
            <DeliveryHistory
              records={historyRecords}
              onClear={clearHistory}
              showSubdomain={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Variant: Sticky Footer ──────────────────────────────────
  return (
    <div className="pb-48">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{subdomain}</h1>
          {loading ? loadingIndicator : (
            <p className="text-sm text-muted-foreground">{posts.length} posts found</p>
          )}
        </div>

        {posts.length > 0 && !jobId && (
          <PostList
            posts={posts}
            selectedSlugs={selectedSlugs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
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
            {job.status === "completed" && <DownloadButton jobId={jobId} onDownload={recordDownload} />}
            {job.status === "completed" && emailConfigured && (
              <>
                <Separator />
                <KindleEmailInput value={kindleEmail} onChange={setKindleEmail} />
                <SendToKindleButton jobId={jobId} kindleEmail={kindleEmail} onSent={recordKindleSent} />
              </>
            )}
            {(job.status === "completed" || job.status === "failed") && (
              <Button variant="ghost" size="sm" onClick={handleStartOver}>
                Start over
              </Button>
            )}
          </div>
        )}

        <DeliveryHistory
          records={historyRecords}
          onClear={clearHistory}
          showSubdomain={false}
        />
      </div>

      {/* Sticky footer */}
      {!jobId && posts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
            {(() => {
              const paidCount = posts.filter(
                (p) => selectedSlugs.has(p.slug) && p.audience === "only_paid"
              ).length;
              return paidCount > 0 && !cookie ? (
                <div className="flex gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    {paidCount} paid post{paidCount !== 1 ? "s" : ""} selected without a session cookie.
                  </span>
                </div>
              ) : null;
            })()}
            <CookieInput value={cookie} onChange={setCookie} />
            <Button
              onClick={handleGenerate}
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
          </div>
        </div>
      )}
    </div>
  );
}
