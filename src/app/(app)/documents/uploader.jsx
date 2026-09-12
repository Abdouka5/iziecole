"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "circulaire", label: "Circulaire" },
  { value: "bulletin", label: "Bulletin" },
  { value: "autre", label: "Autre" },
];

export function Uploader({ schoolId, userId }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `${schoolId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      school_id: schoolId,
      uploaded_by: userId,
      name: file.name,
      path,
      size_bytes: file.size,
      mime_type: file.type,
      category,
    });

    setUploading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button asChild disabled={uploading}>
        <label className="cursor-pointer">
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {uploading ? "Envoi..." : "Importer un fichier"}
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
