"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

type FeatureFlagsContextType = {
  flags: string[];
  hasFlag: (name: string) => boolean;
  loading: boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | null>(null);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ flags: string[] }>("/api/feature-flags")
      .then((res: { flags: string[] }) => setFlags(res.flags))
      .catch(() => setFlags([]))
      .finally(() => setLoading(false));
  }, []);

  const hasFlag = (name: string) => flags.includes(name);

  return (
    <FeatureFlagsContext.Provider value={{ flags, hasFlag, loading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  return ctx ?? { flags: [], hasFlag: () => false, loading: false };
}
