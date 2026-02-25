"use client";

import SubstackUrlInput from "@/components/SubstackUrlInput";
import DeliveryHistory from "@/components/DeliveryHistory";
import { useDeliveryHistory } from "@/hooks/useDeliveryHistory";

export default function Home() {
  const { records, clearHistory } = useDeliveryHistory();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Substack to Kindle</h1>
        <p className="text-muted-foreground text-lg">
          Convert any Substack newsletter into Kindle-ready EPUBs with images and footnotes.
        </p>
      </div>
      <SubstackUrlInput />
      <p className="text-xs text-muted-foreground max-w-md text-center">
        Enter a Substack URL or subdomain. You&apos;ll be able to pick which posts to convert.
        Supports paid content if you provide your session cookie.
      </p>
      <div className="w-full max-w-md">
        <DeliveryHistory records={records} onClear={clearHistory} />
      </div>
    </div>
  );
}
