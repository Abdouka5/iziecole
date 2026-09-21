"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ScheduleControls({ classes }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const view = searchParams.get("view") ?? "week";

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={searchParams.get("classId") ?? ""} onValueChange={(v) => updateParam("classId", v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Choisir une classe" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => updateParam("view", "week")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium",
            view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Vue semaine
        </button>
        <button
          type="button"
          onClick={() => updateParam("view", "list")}
          className={cn(
            "flex items-center gap-1.5 border-l px-3 py-1.5 text-sm font-medium",
            view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          <List className="h-4 w-4" />
          Liste
        </button>
      </div>
    </div>
  );
}
