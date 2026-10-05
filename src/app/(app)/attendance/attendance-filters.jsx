"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

// Classe / Type filters, URL-param driven like the other filter bars in the
// app (GradeFilters, ScheduleControls...). A page navigation resets the
// pagination param too since it isn't included here.
export function AttendanceFilters({ classes }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <>
      <Select value={searchParams.get("classId") ?? ALL} onValueChange={(v) => updateParam("classId", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Classe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("type") ?? ALL} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les types</SelectItem>
          <SelectItem value="absence">Absence</SelectItem>
          <SelectItem value="retard">Retard</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}
