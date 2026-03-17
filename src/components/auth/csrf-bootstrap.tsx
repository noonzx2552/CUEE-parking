"use client";

import { useEffect } from "react";

export function CsrfBootstrap() {
  useEffect(() => {
    void fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  }, []);

  return null;
}
