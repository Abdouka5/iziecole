"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DocumentActions({ documentId, path, name, canDelete }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    setBusy(false);
    if (error) {
      alert(`Impossible de générer le lien : ${error.message}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from("documents").remove([path]);
    await supabase.from("documents").delete().eq("id", documentId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        aria-label={`Télécharger ${name}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
      {canDelete ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Supprimer ${name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
