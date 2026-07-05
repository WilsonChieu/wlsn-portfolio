"use client";

import { createContext, useContext, useState } from "react";

type LoaderContextValue = {
  isComplete: boolean;
  playedIntro: boolean;
  markComplete: (playedIntro: boolean) => void;
};

const LoaderContext = createContext<LoaderContextValue | null>(null);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isComplete, setIsComplete] = useState(false);
  const [playedIntro, setPlayedIntro] = useState(false);

  function markComplete(didPlayIntro: boolean) {
    setPlayedIntro(didPlayIntro);
    setIsComplete(true);
  }

  return (
    <LoaderContext.Provider value={{ isComplete, playedIntro, markComplete }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoaderComplete(): boolean {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoaderComplete must be used within LoaderProvider");
  return ctx.isComplete;
}

export function useLoaderPlayedIntro(): boolean {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoaderPlayedIntro must be used within LoaderProvider");
  return ctx.playedIntro;
}

export function useMarkLoaderComplete(): (playedIntro: boolean) => void {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useMarkLoaderComplete must be used within LoaderProvider");
  return ctx.markComplete;
}
