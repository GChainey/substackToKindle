"use client";

import { useState, useMemo } from "react";
import { PostMetadata } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, List } from "lucide-react";
import PostRow from "./PostRow";

interface PostListProps {
  posts: PostMetadata[];
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  maxHeight?: string;
}

export default function PostList({
  posts,
  selectedSlugs,
  onToggle,
  onSelectAll,
  onDeselectAll,
  maxHeight = "60vh",
}: PostListProps) {
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [posts, search]);

  const { freePosts, paidPosts } = useMemo(() => {
    const free = filtered.filter((p) => p.audience !== "only_paid");
    const paid = filtered.filter((p) => p.audience === "only_paid");
    return { freePosts: free, paidPosts: paid };
  }, [filtered]);

  const allSelected = posts.length > 0 && selectedSlugs.size === posts.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">
          {selectedSlugs.size} of {posts.length} selected
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-orange-600 hover:text-orange-700"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter posts..."
          className="flex-1"
        />
        <Button
          variant={grouped ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setGrouped(!grouped)}
          title={grouped ? "Show chronological" : "Group by free/paid"}
          className="shrink-0"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea style={{ height: maxHeight }}>
        <div className="space-y-1 pr-3">
          {grouped ? (
            <>
              {freePosts.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2">
                    Free posts ({freePosts.length})
                  </div>
                  {freePosts.map((post) => (
                    <PostRow
                      key={post.slug}
                      post={post}
                      selected={selectedSlugs.has(post.slug)}
                      onToggle={onToggle}
                    />
                  ))}
                </>
              )}
              {paidPosts.length > 0 && (
                <>
                  <div className="text-xs font-medium text-amber-600 uppercase tracking-wide px-3 py-2 mt-2 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Paid posts ({paidPosts.length})
                  </div>
                  {paidPosts.map((post) => (
                    <PostRow
                      key={post.slug}
                      post={post}
                      selected={selectedSlugs.has(post.slug)}
                      onToggle={onToggle}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            filtered.map((post) => (
              <PostRow
                key={post.slug}
                post={post}
                selected={selectedSlugs.has(post.slug)}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
