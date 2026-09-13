"use client";

import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

// Uncontrolled on purpose: the admin can type a password by hand, or click
// "Générer" to fill in a random one — either way the input keeps its
// `name` so the surrounding server-action form reads it normally. Looks
// the input up by id instead of a ref since the shared Input component
// isn't wrapped in forwardRef.
export function PasswordField({ id, name, defaultValue }) {
  function handleGenerate() {
    const el = document.getElementById(id);
    if (el) {
      el.value = generatePassword();
      el.focus();
    }
  }

  return (
    <div className="flex gap-2">
      <Input id={id} name={name} type="text" minLength={6} defaultValue={defaultValue} required />
      <Button type="button" variant="outline" onClick={handleGenerate}>
        <RefreshCw className="mr-1.5 h-4 w-4" />
        Générer
      </Button>
    </div>
  );
}
