"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// The three selects that pick which class + matière + période "Saisir des
// notes" is for, shown inside the modal itself instead of requiring the
// page-level GradeFilters to be set first. They drive the same
// classId/subjectId/termId search params GradeFilters does (so picking a
// class here also narrows the page behind the modal), but always keep
// entry=1 so the navigation they trigger doesn't close the modal.
export function GradeEntryFilters({ classes, terms, subjects }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("entry", "1");
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const fields = [
    { key: "classId", label: "Classe", options: classes },
    { key: "subjectId", label: "Matière", options: subjects },
    { key: "termId", label: "Période", options: terms },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {fields.map(({ key, label, options }) => (
        <div key={key} className="space-y-1.5">
          <Label>{label}</Label>
          <Select value={searchParams.get(key) ?? ""} onValueChange={(v) => updateParam(key, v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
