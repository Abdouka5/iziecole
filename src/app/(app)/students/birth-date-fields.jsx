"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const YEAR_SPAN = 40;

function daysInMonth(month, year) {
  if (!month) return 31;
  // Unknown year: allow Feb 29 rather than wrongly hiding it.
  return new Date(Number(year) || 2000, Number(month), 0).getDate();
}

const pad = (n) => String(n).padStart(2, "0");

// Three dropdowns instead of the browser's date picker (slow to reach an
// old birth year). The form still receives a single "birthDate" field in
// YYYY-MM-DD, so the server actions don't change.
export function BirthDateFields({ defaultValue }) {
  const [initYear = "", initMonth = "", initDay = ""] = (defaultValue ?? "").split("-");
  const [day, setDay] = useState(initDay ? String(Number(initDay)) : "");
  const [month, setMonth] = useState(initMonth ? String(Number(initMonth)) : "");
  const [year, setYear] = useState(initYear);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEAR_SPAN + 1 }, (_, i) => String(currentYear - i));
  if (year && !years.includes(year)) years.push(year);
  years.sort((a, b) => Number(b) - Number(a));

  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1));

  const filledCount = [day, month, year].filter(Boolean).length;
  const complete = filledCount === 3;
  const partial = filledCount > 0 && !complete;
  const value = complete ? `${year}-${pad(month)}-${pad(day)}` : "";

  function changeMonth(next) {
    setMonth(next);
    if (day && Number(day) > daysInMonth(next, year)) setDay("");
  }

  function changeYear(next) {
    setYear(next);
    if (day && Number(day) > daysInMonth(month, next)) setDay("");
  }

  function clear() {
    setDay("");
    setMonth("");
    setYear("");
  }

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="birthDate" value={value} />
      <div className="grid grid-cols-[1fr_1.7fr_1.2fr] gap-2">
        <Select name="birthDay" value={day} onValueChange={setDay} required={partial}>
          <SelectTrigger className="w-full" aria-label="Jour de naissance">
            <SelectValue placeholder="Jour" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="birthMonth" value={month} onValueChange={changeMonth} required={partial}>
          <SelectTrigger className="w-full" aria-label="Mois de naissance">
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((label, i) => (
              <SelectItem key={label} value={String(i + 1)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="birthYear" value={year} onValueChange={changeYear} required={partial}>
          <SelectTrigger className="w-full" aria-label="Année de naissance">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filledCount > 0 ? (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Effacer la date
        </button>
      ) : null}
    </div>
  );
}
