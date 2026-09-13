"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

const DISMISSED_KEY = "iziecole_dismissed_announcement";

export function PlatformAnnouncementBanner({ announcement }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === announcement.id);
    } catch {
      setDismissed(false);
    }
  }, [announcement.id]);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, announcement.id);
    } catch {
      // Ignore — it'll just show again next visit.
    }
  }

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 border-b bg-primary/5 px-6 py-3 text-sm">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{announcement.title}</span>{" "}
        <span className="text-muted-foreground">{announcement.body}</span>
      </div>
      <button type="button" onClick={handleDismiss} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
