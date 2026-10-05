"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { paySubscription } from "@/app/(app)/settings/actions";
import { cn } from "@/lib/utils";

// Escalating color per day so it reads as more urgent the closer the
// expiry gets, not just the same yellow banner for three days straight.
const SEVERITY_BY_DAY = {
  3: { wrap: "border-amber-300 bg-amber-50 text-amber-900", icon: "text-amber-600", button: "bg-amber-600 hover:bg-amber-600/90" },
  2: { wrap: "border-orange-300 bg-orange-50 text-orange-900", icon: "text-orange-600", button: "bg-orange-600 hover:bg-orange-600/90" },
  1: { wrap: "border-red-300 bg-red-50 text-red-900", icon: "text-red-600", button: "bg-red-600 hover:bg-red-600/90" },
};

const MESSAGE_BY_DAY = {
  3: "Votre abonnement expire dans 3 jours.",
  2: "Votre abonnement expire dans 2 jours.",
  1: "Votre abonnement expire demain.",
};

function dismissKey(schoolId, daysRemaining) {
  return `iziecole_sub_notice_dismissed_${schoolId}_${daysRemaining}`;
}

// Dismissal is scoped to schoolId + the exact day count, not "forever" —
// closing it on day 3 only hides that day's (least urgent) notice; a new,
// more urgent one reappears on day 2 and day 1 since those are different
// keys the admin hasn't dismissed yet.
export function SubscriptionNotice({ schoolId, daysRemaining }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!schoolId || !daysRemaining) return;
    try {
      setDismissed(localStorage.getItem(dismissKey(schoolId, daysRemaining)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [schoolId, daysRemaining]);

  if (!schoolId || !daysRemaining || daysRemaining < 1 || daysRemaining > 3 || dismissed) return null;

  const severity = SEVERITY_BY_DAY[daysRemaining];

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(schoolId, daysRemaining), "1");
    } catch {
      // Ignore — it just won't stay dismissed across reloads this session.
    }
  }

  return (
    <div className={cn("hidden shrink-0 items-center gap-2 rounded-full border py-1 pl-3 pr-1.5 text-xs font-medium md:flex", severity.wrap)}>
      <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", severity.icon)} />
      <span className="whitespace-nowrap">{MESSAGE_BY_DAY[daysRemaining]}</span>
      <form action={paySubscription}>
        <SubmitButton
          size="xs"
          pendingText="..."
          className={cn("text-white", severity.button)}
        >
          Renouveler
        </SubmitButton>
      </form>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded-full p-1 text-current/60 hover:bg-black/5"
        aria-label="Ne plus afficher aujourd'hui"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
