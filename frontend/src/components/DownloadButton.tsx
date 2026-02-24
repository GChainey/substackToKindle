"use client";

import { getJobDownloadUrl } from "@/lib/api";

interface DownloadButtonProps {
  jobId: string;
}

export default function DownloadButton({ jobId }: DownloadButtonProps) {
  return (
    <a
      href={getJobDownloadUrl(jobId)}
      download
      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Download EPUBs (ZIP)
    </a>
  );
}
