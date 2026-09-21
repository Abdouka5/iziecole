"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export const FORM_PENDING_EVENT = "form-pending";

// Drop this inside a <form> whose submit button lives outside it (see
// ModalSubmitButton). useFormStatus() is the only thing that knows when a
// server action has actually finished — including when it redirects back to
// the same open modal with an error — but it only works for a descendant of
// the <form>, so this renders nothing and just relays that status to the
// button through a window event.
export function FormPendingBridge() {
  const { pending } = useFormStatus();
  const anchorRef = useRef(null);

  useEffect(() => {
    const id = anchorRef.current?.closest("form")?.id;
    if (!id) return;
    window.dispatchEvent(new CustomEvent(FORM_PENDING_EVENT, { detail: { id, pending } }));
  }, [pending]);

  return <span ref={anchorRef} hidden />;
}
