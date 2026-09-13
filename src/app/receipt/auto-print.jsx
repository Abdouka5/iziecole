"use client";

import { useEffect } from "react";

// Thermal printer drivers register as a normal OS printer, so the pragmatic
// way to reach one from a web page is the browser's own print dialog sized
// to receipt width — see docs/decisions.md. No ESC/POS bridge required.
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
