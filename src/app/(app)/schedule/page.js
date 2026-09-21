import Link from "next/link";
import { GraduationCap, BookOpen, User, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { FormModal } from "@/components/layout/form-modal";
import { StatCard, ACCENTS } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScheduleControls } from "./schedule-controls";
import { DeleteSlotButton } from "./delete-slot-button";
import { createSlot } from "./actions";

// Index = timetable_slots.day_of_week (0 = lundi … 6 = dimanche).
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const ACCENT_KEYS = ["blue", "green", "purple", "amber", "pink"];

function hashToAccent(name) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % ACCENT_KEYS.length;
  return ACCENT_KEYS[hash];
}

function formatTime(t) {
  return t?.slice(0, 5) ?? "";
}

export default async function SchedulePage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const classId = params.classId;
  const view = params.view ?? "week";

  const [{ data: classes }, { data: currentYear }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("school_years").select("id, label").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
    supabase.from("subjects").select("id, name").eq("school_id", schoolId).order("name"),
  ]);

  const selectedClass = (classes ?? []).find((c) => c.id === classId);

  let slots = [];
  if (classId) {
    const { data: slotsData } = await supabase
      .from("timetable_slots")
      .select("id, day_of_week, start_time, end_time, subjects(name), profiles(full_name)")
      .eq("class_id", classId)
      .order("start_time");
    slots = slotsData ?? [];
  }

  // Courses grouped per day, in chronological order.
  const slotsByDay = DAY_LABELS.map((_, dayIndex) =>
    slots
      .filter((s) => s.day_of_week === dayIndex)
      .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time)),
  );

  const teacherCount = new Set(slots.map((s) => s.profiles?.full_name).filter(Boolean)).size;
  const startTimes = slots.map((s) => s.start_time).sort();
  const endTimes = slots.map((s) => s.end_time).sort();
  const span = slots.length > 0 ? `${formatTime(startTimes[0])} - ${formatTime(endTimes[endTimes.length - 1])}` : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emploi du Temps"
        subtitle="Consultez et gérez les emplois du temps de vos classes."
        actions={
          <>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
              Année scolaire {currentYear?.label ?? "non définie"}
            </span>
            {classId ? (
              <Button asChild>
                <Link href={`/schedule?classId=${classId}&new=1`}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Ajouter un cours
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <ScheduleControls classes={classes ?? []} />

      {!classId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Choisissez une classe pour afficher son emploi du temps.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={GraduationCap} label="Classe sélectionnée" value={selectedClass?.name ?? "—"} accent="blue" />
            <StatCard icon={BookOpen} label="Nombre de cours" value={slots.length} accent="green" />
            <StatCard icon={User} label="Enseignants" value={teacherCount} accent="purple" />
            <StatCard icon={Clock} label="Amplitude horaire" value={span} accent="amber" />
          </div>

          <FormModal
            open={Boolean(params.new)}
            closeHref={`/schedule?classId=${classId}`}
            title="Ajouter un cours"
            description={
              !currentYear
                ? "Aucune année scolaire configurée — configurez-en une dans Paramètres avant d'ajouter un cours."
                : !(subjects ?? []).length
                  ? "Aucune matière configurée — ajoutez-en dans Paramètres."
                  : `Sur l'emploi du temps de ${selectedClass?.name}.`
            }
            footer={
              currentYear && (subjects ?? []).length ? (
                <>
                  <ModalSubmitButton form="new-slot-form" pendingText="Ajout...">
                    Ajouter
                  </ModalSubmitButton>
                  <Button variant="outline" asChild>
                    <Link href={`/schedule?classId=${classId}`}>Annuler</Link>
                  </Button>
                </>
              ) : (
                <Button variant="outline" asChild>
                  <Link href={currentYear ? "/settings?section=subjects" : "/settings?section=year"}>
                    Aller dans Paramètres
                  </Link>
                </Button>
              )
            }
          >
            {currentYear && (subjects ?? []).length ? (
              <form id="new-slot-form" action={createSlot} className="space-y-4 py-2">
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="schoolYearId" value={currentYear.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Matière</Label>
                    <Select name="subjectId" required>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jour</Label>
                    <Select name="dayOfWeek" required>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_LABELS.map((d, i) => (
                          <SelectItem key={d} value={String(i)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Heure de début</Label>
                    <Input id="startTime" type="time" name="startTime" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Heure de fin</Label>
                    <Input id="endTime" type="time" name="endTime" required />
                  </div>
                </div>
                {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
              </form>
            ) : null}
          </FormModal>

          {view === "week" ? (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[840px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    {DAY_LABELS.map((d) => (
                      <th key={d} className="p-3 text-left font-medium text-muted-foreground">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {slotsByDay.map((daySlots, dayIndex) => (
                      <td key={dayIndex} className="p-2 align-top">
                        {daySlots.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-muted-foreground">—</p>
                        ) : (
                          daySlots.map((s) => {
                            const { bg, fg } = ACCENTS[hashToAccent(s.subjects?.name ?? "")];
                            return (
                              <div
                                key={s.id}
                                className="mb-1.5 flex items-start justify-between gap-1 rounded-lg p-2 text-xs"
                                style={{ backgroundColor: bg, color: fg }}
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold">{s.subjects?.name}</p>
                                  {s.profiles?.full_name ? <p className="opacity-80">{s.profiles.full_name}</p> : null}
                                  <p className="opacity-80">
                                    {formatTime(s.start_time)} - {formatTime(s.end_time)}
                                  </p>
                                </div>
                                <DeleteSlotButton slotId={s.id} />
                              </div>
                            );
                          })
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jour</TableHead>
                    <TableHead>Horaire</TableHead>
                    <TableHead>Matière</TableHead>
                    <TableHead>Enseignant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Aucun cours pour cette classe.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...slots]
                      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                      .map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{DAY_LABELS[s.day_of_week]}</TableCell>
                          <TableCell>{formatTime(s.start_time)} - {formatTime(s.end_time)}</TableCell>
                          <TableCell className="font-medium">{s.subjects?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.profiles?.full_name ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <DeleteSlotButton slotId={s.id} />
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
