"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSubstackUrl } from "@/lib/parseSubstackUrl";
import { checkSubdomain } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        <Input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="samkriss.substack.com"
          disabled={checking}
          className="h-12 text-lg"
        />
        <Button
          type="submit"
          disabled={checking}
          className="h-12 px-6 bg-orange-500 hover:bg-orange-600"
        >
          {checking ? "Checking..." : "Go"}
        </Button>
      </div>
      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}
    </form>
  );
}
