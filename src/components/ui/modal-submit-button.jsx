"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FORM_PENDING_EVENT } from "@/components/ui/form-pending-bridge";

// A stuck spinner is worse than a missing one, so if the form has no
// <FormPendingBridge /> to report completion, give up waiting after this.
const PENDING_SAFETY_MS = 20000;

// FormModal renders its submit button in a footer outside the <form> DOM
// subtree, wired up via the HTML `form` attribute instead of nesting —
// react-dom's useFormStatus() only works for a descendant of the <form>, so
// the button can't read the status itself. It goes pending on the form's
// submit event (instant feedback, works wherever the button sits in the DOM)
// and is released by the <FormPendingBridge /> placed inside the form, which
// reports when the action has really finished — e.g. a server-side
// validation error that redirects back to the same, still-open modal.
export function ModalSubmitButton({ form, children, pendingText, disabled, ...props }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const formEl = document.getElementById(form);
    let safetyTimer;

    const handleSubmit = () => {
      setPending(true);
      clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => setPending(false), PENDING_SAFETY_MS);
    };
    const handleStatus = (event) => {
      if (event.detail?.id !== form) return;
      setPending(event.detail.pending);
      if (!event.detail.pending) clearTimeout(safetyTimer);
    };

    formEl?.addEventListener("submit", handleSubmit);
    window.addEventListener(FORM_PENDING_EVENT, handleStatus);
    return () => {
      clearTimeout(safetyTimer);
      formEl?.removeEventListener("submit", handleSubmit);
      window.removeEventListener(FORM_PENDING_EVENT, handleStatus);
    };
  }, [form]);

  return (
    <Button type="submit" form={form} disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
