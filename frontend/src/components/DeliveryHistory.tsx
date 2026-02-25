"use client";

import { DeliveryRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, Trash2, History } from "lucide-react";
import { getJobDownloadUrl } from "@/lib/api";

interface DeliveryHistoryProps {
  records: DeliveryRecord[];
  onClear: () => void;
  showSubdomain?: boolean;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DeliveryHistory({
  records,
  onClear,
  showSubdomain = true,
}: DeliveryHistoryProps) {
  if (records.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Recent deliveries
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-2 text-sm py-1.5 border-b last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {showSubdomain && (
                    <span className="font-medium truncate">
                      {record.subdomain}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {record.postCount} post{record.postCount !== 1 ? "s" : ""}
                  </span>
                  {record.method === "kindle" ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Mail className="w-2.5 h-2.5 mr-0.5" />
                      Kindle
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Download className="w-2.5 h-2.5 mr-0.5" />
                      Download
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {timeAgo(record.timestamp)}
                </div>
              </div>
              {record.method === "download" && (
                <a
                  href={getJobDownloadUrl(record.jobId)}
                  download
                  className="text-xs text-orange-600 hover:underline shrink-0"
                >
                  Re-download
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
