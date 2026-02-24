"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getJobDownloadUrl } from "@/lib/api";

interface DownloadButtonProps {
  jobId: string;
}

export default function DownloadButton({ jobId }: DownloadButtonProps) {
  return (
    <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
      <a href={getJobDownloadUrl(jobId)} download>
        <Download className="w-4 h-4 mr-2" />
        Download EPUBs (ZIP)
      </a>
    </Button>
  );
}
