"use client";

import { useState, useMemo } from "react";
import { PostMetadata } from "@/lib/types";
import PostRow from "./PostRow";

interface PostListProps {
  posts: PostMetadata[];
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function PostList({
  posts,
  selectedSlugs,
  onToggle,
  onSelectAll,
  onDeselectAll,
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
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {selectedSlugs.size} of {posts.length} selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter posts..."
        className="w-full px-3 py-2 mb-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((post) => (
          <PostRow
            key={post.slug}
            post={post}
            selected={selectedSlugs.has(post.slug)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
