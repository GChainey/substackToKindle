"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type LayoutVariant = "sticky" | "checkout";

const VariantContext = createContext<{
  variant: LayoutVariant;
  setVariant: (v: LayoutVariant) => void;
}>({ variant: "checkout", setVariant: () => {} });

export function useVariant() {
  return useContext(VariantContext);
}

export function VariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<LayoutVariant>("checkout");
  const [open, setOpen] = useState(false);

  const setVariant = useCallback((v: LayoutVariant) => {
    setVariantState(v);
    if (typeof window !== "undefined") {
      localStorage.setItem("layout-variant", v);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("layout-variant") as LayoutVariant | null;
    if (saved === "sticky" || saved === "checkout") {
      setVariantState(saved);
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <VariantContext.Provider value={{ variant, setVariant }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Layout Variant</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant={variant === "sticky" ? "default" : "outline"}
              className="justify-start h-auto py-3"
              onClick={() => { setVariant("sticky"); setOpen(false); }}
            >
              <div className="text-left">
                <div className="font-medium">Sticky Footer</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Single column — cookie input and generate button stick to the bottom
                </div>
              </div>
            </Button>
            <Button
              variant={variant === "checkout" ? "default" : "outline"}
              className="justify-start h-auto py-3"
              onClick={() => { setVariant("checkout"); setOpen(false); }}
            >
              <div className="text-left">
                <div className="font-medium">Two-Column Checkout</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Posts on the left, summary and actions on the right
                </div>
              </div>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd> to toggle this menu
          </p>
        </DialogContent>
      </Dialog>
    </VariantContext.Provider>
  );
}
