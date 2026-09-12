import Link from "next/link";
import { GraduationCap, BookOpen, User, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, ACCENTS } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
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

  const [{ data: classes }, { data: currentYear }, { data: rooms }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("school_years").select("id, label").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
    supabase.from("rooms").select("id, name").eq("school_id", schoolId).order("name"),
  ]);

  const selectedClass = (classes ?? []).find((c) => c.id === classId);

  let slots = [];
  let classSubjects = [];
  if (classId) {
    const [{ data: slotsData }, { data: classSubjectsData }] = await Promise.all([
      supabase
        .from("timetable_slots")
        .select("id, day_of_week, start_time, end_time, subjects(name), profiles(full_name), rooms(name)")
        .eq("class_id", classId)
        .order("start_time"),
      supabase
        .from("class_subjects")
        .select("id, subjects(name), profiles(full_name)")
        .eq("class_id", classId),
    ]);
    slots = slotsData ?? [];
    classSubjects = classSubjectsData ?? [];
  }

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

          {params.new ? (
            <Card>
              <CardHeader>
                <CardTitle>Ajouter un cours</CardTitle>
                <CardDescription>
                  {currentYear
                    ? `Sur l'emploi du temps de ${selectedClass?.name}.`
                    : "Aucune année scolaire configurée — configurez-en une dans Paramètres avant d'ajouter un cours."}
                </CardDescription>
              </CardHeader>
              {currentYear ? (
                <CardContent>
                  <form action={createSlot} className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="classId" value={classId} />
                    <input type="hidden" name="schoolYearId" value={currentYear.id} />
                    <div className="space-y-2">
                      <Label>Matière (enseignant)</Label>
                      <Select name="classSubjectId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {classSubjects.map((cs) => (
                            <SelectItem key={cs.id} value={cs.id}>
                              {cs.subjects?.name} — {cs.profiles?.full_name ?? "Sans enseignant"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Jour</Label>
                      <Select name="dayOfWeek" required>
                        <SelectTrigger>
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
                      <Label>Heure de début</Label>
                      <Input type="time" name="startTime" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure de fin</Label>
                      <Input type="time" name="endTime" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Salle</Label>
                      <Select name="roomId">
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                          {(rooms ?? []).map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {params.error ? (
                      <p className="text-sm text-destructive sm:col-span-2">{params.error}</p>
                    ) : null}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" disabled={classSubjects.length === 0}>
                        Ajouter
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/schedule?classId=${classId}`}>Annuler</Link>
                      </Button>
                    </div>
                    {classSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground sm:col-span-2">
                        Aucune matière assignée à cette classe pour le moment.
                      </p>
                    ) : null}
                  </form>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {view === "week" ? (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-20 p-3 text-left font-medium text-muted-foreground">Heure</th>
                    {DAY_LABELS.map((d) => (
                      <th key={d} className="p-3 text-left font-medium text-muted-foreground">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour) => (
                    <tr key={hour} className="border-b last:border-0">
                      <td className="p-3 align-top text-xs text-muted-foreground">{hour}</td>
                      {DAY_LABELS.map((_, dayIndex) => {
                        const cellSlots = slots.filter(
                          (s) => s.day_of_week === dayIndex && formatTime(s.start_time) === hour,
                        );
                        return (
                          <td key={dayIndex} className="p-2 align-top">
                            {cellSlots.map((s) => {
                              const { bg, fg } = ACCENTS[hashToAccent(s.subjects?.name ?? "")];
                              return (
                                <div
                                  key={s.id}
                                  className="mb-1 flex items-start justify-between gap-1 rounded-lg p-2 text-xs"
                                  style={{ backgroundColor: bg, color: fg }}
                                >
                                  <div>
                                    <p className="font-semibold">{s.subjects?.name}</p>
                                    <p className="opacity-80">
                                      {s.profiles?.full_name ?? "—"}
                                      {s.rooms?.name ? ` | ${s.rooms.name}` : ""}
                                    </p>
                                  </div>
                                  <DeleteSlotButton slotId={s.id} />
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
                    <TableHead>Salle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
                          <TableCell className="text-muted-foreground">{s.rooms?.name ?? "—"}</TableCell>
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
