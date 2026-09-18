"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// FormModal renders its submit button in a footer outside the <form> DOM
// subtree, wired up via the HTML `form` attribute instead of nesting —
// react-dom's useFormStatus() only works for a descendant of the <form>
// element in the React tree, so it can't tell this button anything. This
// listens to the target form's submit event directly instead, which fires
// regardless of where the button lives in the DOM.
export function ModalSubmitButton({ form, children, pendingText, disabled, ...props }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const formEl = document.getElementById(form);
    if (!formEl) return;
    const handleSubmit = () => setPending(true);
    formEl.addEventListener("submit", handleSubmit);
    return () => formEl.removeEventListener("submit", handleSubmit);
  }, [form]);

  return (
    <Button type="submit" form={form} disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
