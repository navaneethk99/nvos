"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function InstanceStatusRefresh({
  shouldRefresh,
}: {
  shouldRefresh: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!shouldRefresh) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [router, shouldRefresh]);

  return null;
}
