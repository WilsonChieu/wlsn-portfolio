"use client";

import { createContext, useContext, useState } from "react";

type LoaderContextValue = {
  isComplete: boolean;
  markComplete: () => void;
};

const LoaderContext = createContext<LoaderContextValue | null>(null);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isComplete, setIsComplete] = useState(false);
  return (
    <LoaderContext.Provider value={{ isComplete, markComplete: () => setIsComplete(true) }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoaderComplete(): boolean {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoaderComplete must be used within LoaderProvider");
  return ctx.isComplete;
}

export function useMarkLoaderComplete(): () => void {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useMarkLoaderComplete must be used within LoaderProvider");
  return ctx.markComplete;
}
