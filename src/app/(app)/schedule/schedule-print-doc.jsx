import { ACCENTS } from "@/components/layout/stat-card";
import { DAY_LABELS, formatTime, hashToAccent } from "./schedule-utils";

// The document that actually gets printed / saved as PDF: A4 landscape,
// invisible on screen (`hidden print:block`) while the rest of the page is
// `print:hidden`. @page margin is 0 with the spacing done as padding, which
// is also what stops Chrome from stamping its own URL/date header and
// footer onto the sheet.
export function SchedulePrintDoc({ school, classLabel, yearLabel, view, slots, slotsByDay }) {
  const editedOn = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Africa/Dakar",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const contact = [school.address, school.phone].filter(Boolean).join("  ·  ");

  // Monday-Saturday always; Sunday only when a course is actually on it.
  const visibleDays = DAY_LABELS.map((label, index) => ({ label, index })).filter(
    ({ index }) => index < 6 || slotsByDay[index].length > 0,
  );

  const sortedSlots = [...slots].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time),
  );

  return (
    <section className="hidden bg-white p-[10mm] text-[#0d1526] print:block">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>

      <header className="flex items-end justify-between gap-6 border-b-2 border-[#1d4ed8] pb-4">
        <div className="flex items-center gap-4">
          {school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt="" className="h-14 w-14 rounded-lg object-contain" />
          ) : null}
          <div>
            <p className="text-[22px] font-extrabold leading-tight tracking-tight">{school.name}</p>
            {contact ? <p className="mt-0.5 text-[11px] text-[#5a6480]">{contact}</p> : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f97316]">Emploi du temps</p>
          <p className="text-[26px] font-extrabold leading-tight tracking-tight text-[#1d4ed8]">{classLabel}</p>
          <p className="text-[11px] text-[#5a6480]">Année scolaire {yearLabel}</p>
        </div>
      </header>

      {view === "week" ? (
        <table className="mt-5 w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e2e7f2] text-[11px]">
          <thead>
            <tr>
              {visibleDays.map(({ label }) => (
                <th
                  key={label}
                  className="bg-[#0b1220] px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="h-[105mm]">
              {visibleDays.map(({ label, index }, position) => (
                <td
                  key={label}
                  className={`p-2 align-top ${position > 0 ? "border-l border-[#eef1f6]" : ""}`}
                >
                  {slotsByDay[index].length === 0 ? (
                    <p className="py-1 text-center text-[#a8b0c4]">—</p>
                  ) : (
                    slotsByDay[index].map((s) => {
                      const { bg, fg } = ACCENTS[hashToAccent(s.subjects?.name ?? "")];
                      return (
                        <div
                          key={s.id}
                          className="mb-1.5 break-inside-avoid rounded-md border-l-[3px] px-2 py-1.5"
                          style={{ backgroundColor: bg, borderColor: fg }}
                        >
                          <p className="text-[11px] font-bold" style={{ color: fg }}>
                            {s.subjects?.name}
                          </p>
                          {s.profiles?.full_name ? (
                            <p className="text-[10px] text-[#39435c]">{s.profiles.full_name}</p>
                          ) : null}
                          <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#39435c]">
                            {formatTime(s.start_time)} - {formatTime(s.end_time)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="mt-5 w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e2e7f2] text-[12px]">
          <thead>
            <tr>
              {["Jour", "Horaire", "Matière", "Enseignant"].map((heading) => (
                <th
                  key={heading}
                  className="bg-[#0b1220] px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSlots.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#66708a]">
                  Aucun cours programmé.
                </td>
              </tr>
            ) : (
              sortedSlots.map((s, i) => {
                const { fg } = ACCENTS[hashToAccent(s.subjects?.name ?? "")];
                return (
                  <tr key={s.id} className={`break-inside-avoid ${i % 2 === 1 ? "bg-[#f8faff]" : ""}`}>
                    <td className="px-4 py-2 font-semibold">{DAY_LABELS[s.day_of_week]}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {formatTime(s.start_time)} - {formatTime(s.end_time)}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                        style={{ backgroundColor: fg }}
                      />
                      {s.subjects?.name}
                    </td>
                    <td className="px-4 py-2 text-[#5a6480]">{s.profiles?.full_name ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      <footer className="mt-5 flex items-center justify-between border-t border-[#e2e7f2] pt-3 text-[10px] text-[#66708a]">
        <p>Édité le {editedOn}</p>
        <div className="flex items-center gap-2">
          <span>Généré avec</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-5 w-auto" />
        </div>
      </footer>
    </section>
  );
}
