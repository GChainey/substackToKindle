"use client";

import { useState, useMemo } from "react";
import { PostMetadata } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const filtered = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q))
    );
  }, [posts, search]);

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

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter posts..."
        className="mb-3"
      />

      <ScrollArea style={{ height: maxHeight }}>
        <div className="space-y-1 pr-3">
          {filtered.map((post) => (
            <PostRow
              key={post.slug}
              post={post}
              selected={selectedSlugs.has(post.slug)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
