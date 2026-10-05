import { MapPin, Phone, BarChart3, Trophy, Medal, MessageCircle } from "lucide-react";
import { frNumber } from "@/lib/report-card";

// The printable A4-portrait bulletin itself — shared by the single-student
// route and the whole-class bulk route. Pure presentation: every value it
// shows comes in through `data` (see loadReportCardData), nothing here
// queries or fabricates anything.
export function ReportCardDocument({ school, data, editedOn }) {
  const { student, termLabel, periodLabel, schoolYearLabel, classLabel, levelLabel, classSize, subjectRows, totalCoefficients, average, totalPoints, maxPoints, rank, absenceDays, lateCount, appreciation } = data;

  const leftInfo = [
    { label: "Nom", value: student.last_name || "—" },
    { label: "Prénom(s)", value: student.first_name || "—" },
    { label: "Matricule", value: student.matricule || "—" },
    { label: "Date de naissance", value: student.birth_date ? new Date(student.birth_date).toLocaleDateString("fr-FR") : "—" },
    { label: "Lieu de naissance", value: student.birth_place || "—" },
    { label: "Nationalité", value: student.nationality || "—" },
  ];
  const rightInfo = [
    { label: "Établissement", value: school.name || "—" },
    { label: "Niveau", value: levelLabel || "—" },
    { label: "Classe", value: classLabel || "—" },
    { label: "Effectif de la classe", value: classSize ? `${classSize} élève${classSize > 1 ? "s" : ""}` : "—" },
    { label: "Absences", value: `${absenceDays} jour${absenceDays > 1 ? "s" : ""}` },
    { label: "Retards", value: String(lateCount) },
  ];

  return (
    <div className="w-[210mm] bg-white p-[12mm] text-[#0d1526] print:w-full print:p-[12mm]">
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } }`}</style>

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#1d4ed8] pb-4">
        <div className="space-y-1 text-[11px] text-[#5a6480]">
          {school.address ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#1d4ed8]" />
              {school.address}
            </p>
          ) : null}
          {school.phone ? (
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#1d4ed8]" />
              {school.phone}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[16px] font-extrabold leading-tight tracking-tight">{school.name}</p>
          </div>
          {school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-contain" />
          ) : null}
        </div>
      </header>

      <div className="mt-5 text-center">
        <h1 className="text-[26px] font-extrabold uppercase tracking-tight text-[#0b1220]">Bulletin de notes</h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-bold text-[#1d4ed8]">
            Année scolaire {schoolYearLabel}
          </span>
          <span className="rounded-full bg-[#1d4ed8] px-3 py-1 text-[11px] font-bold text-white">{termLabel}</span>
        </div>
        {periodLabel ? <p className="mt-1.5 text-[11px] text-[#5a6480]">{periodLabel}</p> : null}
      </div>

      <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1.5 rounded-xl border border-[#e2e7f2] bg-[#f8faff] p-4 text-[11.5px]">
        {leftInfo.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border-b border-dashed border-[#dde3f0] py-1">
            <span className="text-[#5a6480]">{row.label} :</span>
            <span className="font-semibold text-right">{row.value}</span>
          </div>
        ))}
        {rightInfo.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border-b border-dashed border-[#dde3f0] py-1">
            <span className="text-[#5a6480]">{row.label} :</span>
            <span className="font-semibold text-right">{row.value}</span>
          </div>
        ))}
      </section>

      <table className="mt-5 w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#e2e7f2] text-[12px]">
        <thead>
          <tr>
            <th className="w-[36px] bg-[#0b1220] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-white">N°</th>
            <th className="bg-[#0b1220] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-white">Disciplines</th>
            <th className="w-[110px] bg-[#0b1220] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-white">Coefficient</th>
            <th className="w-[110px] bg-[#0b1220] px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-white">Note / 20</th>
          </tr>
        </thead>
        <tbody>
          {subjectRows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-[#66708a]">
                Aucune matière configurée pour cette classe.
              </td>
            </tr>
          ) : (
            subjectRows.map((row, i) => (
              <tr key={row.subjectId ?? i} className={i % 2 === 1 ? "bg-[#f8faff]" : ""} style={{ breakInside: "avoid" }}>
                <td className="px-3 py-1.5 text-[#66708a]">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium">{row.name}</td>
                <td className="px-3 py-1.5 text-center tabular-nums">{row.coefficient}</td>
                <td className="px-3 py-1.5 text-center">
                  {row.score != null ? (
                    <span
                      className="inline-block rounded px-2 py-0.5 font-bold tabular-nums"
                      style={{
                        backgroundColor: row.score >= 10 ? "#dcfce7" : "#ffedd5",
                        color: row.score >= 10 ? "#15803d" : "#c2410c",
                      }}
                    >
                      {frNumber(row.score, 2)}
                    </span>
                  ) : (
                    <span className="text-[#a8b0c4]">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-right text-[11px] font-extrabold uppercase tracking-[0.08em]">
              Total
            </td>
            <td className="border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-center text-[13px] font-extrabold tabular-nums">
              {totalCoefficients || "—"}
            </td>
            <td className="border-t border-[#e2e7f2] bg-[#f4f7ff] px-3 py-2 text-center text-[13px] font-extrabold tabular-nums text-[#1d4ed8]">
              {average != null ? `${frNumber(average, 1)} / 20` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-5 grid grid-cols-3 gap-3" style={{ breakInside: "avoid" }}>
        <SummaryCard icon={BarChart3} label="Moyenne générale" value={average != null ? `${frNumber(average, 1)} / 20` : "—"} color="#1d4ed8" />
        <SummaryCard icon={Trophy} label="Total des points" value={average != null ? `${Math.round(totalPoints)} / ${maxPoints}` : "—"} color="#f97316" />
        <SummaryCard icon={Medal} label="Rang" value={rank != null ? `${rank} / ${classSize}` : "Non disponible"} color="#9333ea" />
      </section>

      <section className="mt-4 rounded-xl border border-[#e2e7f2] p-4" style={{ breakInside: "avoid" }}>
        <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#39435c]">
          <MessageCircle className="h-4 w-4 text-[#1d4ed8]" />
          Appréciation du conseil de classe
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#39435c]">
          {appreciation || "Aucune appréciation enregistrée."}
        </p>
      </section>

      <footer className="mt-6 flex items-end justify-between gap-4" style={{ breakInside: "avoid" }}>
        <p className="text-[10px] text-[#66708a]">
          Généré avec{" "}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="inline h-4 w-auto align-text-bottom" />
        </p>
        <div className="text-right">
          <p className="text-[11px] text-[#5a6480]">Édité le {editedOn}</p>
          <div className="mt-2 flex h-20 w-20 flex-col items-center justify-center rounded-full border border-dashed border-[#c7cfe0] text-center text-[9px] leading-tight text-[#a8b0c4]">
            Cachet
            <br />
            de l&apos;école
          </div>
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-[#e2e7f2] px-4 py-3" style={{ borderTopWidth: 3, borderTopColor: color }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#66708a]">{label}</p>
      </div>
      <p className="mt-1.5 text-[18px] font-extrabold tracking-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
