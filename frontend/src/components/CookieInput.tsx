"use client";

import { useState } from "react";

interface CookieInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CookieInput({ value, onChange }: CookieInputProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span>I have a paid subscription</span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">
            To access paid posts, paste your <code className="bg-gray-100 px-1 rounded">substack.sid</code> cookie.
            Open DevTools (F12) &rarr; Application &rarr; Cookies &rarr; copy the value of <code className="bg-gray-100 px-1 rounded">substack.sid</code>.
            This is only used in-memory for your request and never stored.
          </p>
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste substack.sid cookie value"
            className="w-full px-3 py-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}
    </div>
  );
}
