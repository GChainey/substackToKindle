"use client";

import { PostMetadata } from "@/lib/types";

interface PostRowProps {
  post: PostMetadata;
  selected: boolean;
  onToggle: (slug: string) => void;
}

export default function PostRow({ post, selected, onToggle }: PostRowProps) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        selected ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(post.slug)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{post.title}</div>
        {post.subtitle && (
          <div className="text-sm text-gray-500 truncate">{post.subtitle}</div>
        )}
        <div className="flex gap-3 mt-1 text-xs text-gray-400">
          {post.date && <span>{post.date}</span>}
          {post.audience === "only_paid" && (
            <span className="text-amber-600 font-medium">Paid</span>
          )}
          {post.word_count && <span>{post.word_count.toLocaleString()} words</span>}
        </div>
      </div>
    </label>
  );
}
