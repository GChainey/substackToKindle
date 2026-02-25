"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Check, Loader2 } from "lucide-react";
import { sendToKindle } from "@/lib/api";

interface SendToKindleButtonProps {
  jobId: string;
  kindleEmail: string;
  onSent?: () => void;
}

export default function SendToKindleButton({
  jobId,
  kindleEmail,
  onSent,
}: SendToKindleButtonProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = kindleEmail.includes("@") && kindleEmail.includes(".");

  async function handleSend() {
    if (!isValidEmail) return;
    setState("sending");
    setErrorMsg("");
    try {
      const result = await sendToKindle(jobId, kindleEmail);
      if (result.success) {
        setState("sent");
        onSent?.();
      } else {
        setState("error");
        setErrorMsg(result.error || result.message);
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send");
    }
  }

  if (state === "sent") {
    return (
      <Button disabled size="lg" className="w-full bg-green-600">
        <Check className="w-4 h-4 mr-2" />
        Sent to Kindle
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={handleSend}
        disabled={!isValidEmail || state === "sending"}
        size="lg"
        variant="outline"
        className="w-full"
      >
        {state === "sending" ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Mail className="w-4 h-4 mr-2" />
        )}
        {state === "sending" ? "Sending..." : "Send to Kindle"}
      </Button>
      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
