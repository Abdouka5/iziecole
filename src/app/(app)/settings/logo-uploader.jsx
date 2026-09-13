"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoUploader({ schoolId, currentUrl }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentUrl);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${schoolId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("school-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
    // Cache-bust so the new logo shows immediately even though the path is stable.
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("schools")
      .update({ logo_url: publicUrl })
      .eq("id", schoolId);

    setUploading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreview(publicUrl);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo de l'établissement" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucun</span>
        )}
      </div>
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            {uploading ? "Envoi..." : "Changer le logo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </Button>
        <p className="text-xs text-muted-foreground">
          Facultatif. Utilisé sur les reçus et documents PDF. PNG/JPG, 2 Mo max.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
