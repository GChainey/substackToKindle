"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface CookieInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CookieInput({ value, onChange }: CookieInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors rounded-lg">
        <span>I have a paid subscription</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          To access paid posts, paste your{" "}
          <code className="bg-muted px-1 rounded text-[11px]">substack.sid</code>{" "}
          cookie. Open DevTools (F12) &rarr; Application &rarr; Cookies &rarr; copy
          the value of{" "}
          <code className="bg-muted px-1 rounded text-[11px]">substack.sid</code>.
          Only used in-memory, never stored.
        </p>
        <Input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste substack.sid cookie value"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
