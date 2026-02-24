"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSubstackUrl } from "@/lib/parseSubstackUrl";
import { checkSubdomain } from "@/lib/api";

export default function SubstackUrlInput() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subdomain = parseSubstackUrl(url);
    if (!subdomain) {
      setError("Enter a valid Substack URL (e.g. samkriss.substack.com)");
      return;
    }

    setError("");
    setChecking(true);

    const result = await checkSubdomain(subdomain);
    setChecking(false);

    if (!result.exists) {
      setError(result.error || "Newsletter not found");
      return;
    }

    router.push(`/newsletter/${subdomain}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="samkriss.substack.com"
          disabled={checking}
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={checking}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {checking ? "Checking..." : "Go"}
        </button>
      </div>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </form>
  );
}
