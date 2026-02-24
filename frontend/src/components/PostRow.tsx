"use client";

import { PostMetadata } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface PostRowProps {
  post: PostMetadata;
  selected: boolean;
  onToggle: (slug: string) => void;
}

function isRealSubtitle(subtitle: string | null): subtitle is string {
  if (!subtitle) return false;
  const trimmed = subtitle.trim();
  if (!trimmed) return false;
  // Filter out subtitles that are just punctuation/ellipsis
  if (/^[.\u2026…·\-_*]+$/.test(trimmed)) return false;
  return true;
}

export default function PostRow({ post, selected, onToggle }: PostRowProps) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
        selected
          ? "bg-orange-50 border-orange-200"
          : "hover:bg-accent border-transparent"
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(post.slug)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground leading-snug">{post.title}</div>
        {isRealSubtitle(post.subtitle) && (
          <div className="text-sm text-muted-foreground truncate mt-0.5">
            {post.subtitle}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {post.date && (
            <span className="text-xs text-muted-foreground">{post.date}</span>
          )}
          {post.audience === "only_paid" && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5 py-0">
              Paid
            </Badge>
          )}
          {post.word_count && (
            <span className="text-xs text-muted-foreground">
              {post.word_count.toLocaleString()} words
            </span>
          )}
        </div>
      </div>
    </label>
  );
}
