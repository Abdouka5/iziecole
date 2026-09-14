"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Wraps a form's submit button with react-dom's useFormStatus so it shows a
// spinner and disables itself while the server action is running — without
// this, a slow action (network, Supabase) looks like nothing happened and
// invites repeat clicks / duplicate submissions.
export function SubmitButton({ children, pendingText, disabled, ...props }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
