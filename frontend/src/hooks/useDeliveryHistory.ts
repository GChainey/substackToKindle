"use client";

import { useState, useEffect, useCallback } from "react";
import { DeliveryRecord } from "@/lib/types";

const STORAGE_KEY = "stk_delivery_history";
const MAX_RECORDS = 100;

export function useDeliveryHistory(filterSubdomain?: string) {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecords(JSON.parse(stored));
    } catch {
      // ignore corrupted data
    }
  }, []);

  const persist = useCallback((next: DeliveryRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full — ignore
    }
  }, []);

  const addRecord = useCallback(
    (record: Omit<DeliveryRecord, "id" | "timestamp">) => {
      const newRecord: DeliveryRecord = {
        ...record,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      setRecords((prev) => {
        const next = [newRecord, ...prev].slice(0, MAX_RECORDS);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  const filtered = filterSubdomain
    ? records.filter((r) => r.subdomain === filterSubdomain)
    : records;

  return { records: filtered, addRecord, clearHistory };
}
