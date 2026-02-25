"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

const STORAGE_KEY = "stk_kindle_email";

interface KindleEmailInputProps {
  value: string;
  onChange: (email: string) => void;
}

export default function KindleEmailInput({ value, onChange }: KindleEmailInputProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) onChange(stored);
      setLoaded(true);
    }
  }, [loaded, onChange]);

  const handleChange = (email: string) => {
    onChange(email);
    try {
      localStorage.setItem(STORAGE_KEY, email);
    } catch {}
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Mail className="w-3.5 h-3.5" />
        Send to Kindle
      </div>
      <Input
        type="email"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="your-kindle@kindle.com"
        className="text-sm"
      />
      <p className="text-[11px] text-muted-foreground">
        Find this in Amazon &rarr; Devices &rarr; Send to Kindle E-mail.
        Add the sender address to your approved list.
      </p>
    </div>
  );
}
