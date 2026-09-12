import Link from "next/link";
import {
  User,
  GraduationCap,
  Wallet,
  CalendarClock,
  UserPlus,
  FilePlus2,
  FileText,
  Send,
  Megaphone,
  Receipt,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { timeAgo } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, ACCENTS } from "@/components/layout/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { EffectifsChart } from "@/components/dashboard/effectifs-chart";

const MONTH_LABELS = [
  "Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const CYCLE_LABELS = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
};
const CYCLE_ORDER = ["maternelle", "primaire", "college", "lycee"];
const CYCLE_ACCENTS = ["blue", "green", "purple", "amber"];

function lastNMonthStarts(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));
}

const QUICK_ACTIONS = [
  { href: "/students", label: "Ajouter un élève", icon: UserPlus, accent: "solid" },
  { href: "/classes", label: "Créer une classe", icon: GraduationCap, accent: "purple" },
  { href: "/grades", label: "Générer un bulletin", icon: FilePlus2, accent: "green" },
  { href: "/communication", label: "Envoyer un message", icon: Send, accent: "amber" },
];

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { count: studentsCount },
    { count: newStudentsThisMonth },
    { count: classesCount },
    { count: pendingInvoices },
    { count: overdueInvoices },
    { data: currentYear },
    { data: allStudents },
    { data: enrollmentLevels },
    { data: recentStudents },
    { data: recentPayments },
    { data: recentAnnouncements },
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId).gte("created_at", startOfMonth),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("school_id", schoolId).in("status", ["pending", "partial", "overdue"]),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "overdue"),
    supabase.from("school_years").select("label").eq("school_id", schoolId).eq("is_current", true).maybeSingle(),
    supabase.from("students").select("created_at").eq("school_id", schoolId),
    supabase.from("enrollments").select("student_id, classes(levels(cycle))").eq("school_id", schoolId).eq("status", "active"),
    supabase.from("students").select("id, first_name, last_name, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(3),
    supabase.from("payments").select("id, amount, paid_at, students(first_name, last_name)").eq("school_id", schoolId).order("paid_at", { ascending: false }).limit(3),
    supabase.from("announcements").select("id, title, published_at").eq("school_id", schoolId).order("published_at", { ascending: false }).limit(3),
  ]);

  const months = lastNMonthStarts(6);
  const effectifsData = months.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const count = (allStudents ?? []).filter((s) => new Date(s.created_at) < monthEnd).length;
    return { month: MONTH_LABELS[monthStart.getMonth()], count };
  });

  const cycleCounts = { maternelle: 0, primaire: 0, college: 0, lycee: 0 };
  for (const row of enrollmentLevels ?? []) {
    const cycle = row.classes?.levels?.cycle;
    if (cycle in cycleCounts) cycleCounts[cycle] += 1;
  }
  const totalEnrolled = Object.values(cycleCounts).reduce((a, b) => a + b, 0);
  const levelData = CYCLE_ORDER.map((cycle, i) => ({
    name: CYCLE_LABELS[cycle],
    value: cycleCounts[cycle],
    fill: `var(--chart-${i + 1})`,
  }));
  const levelConfig = Object.fromEntries(
    CYCLE_ORDER.map((cycle, i) => [CYCLE_LABELS[cycle], { label: CYCLE_LABELS[cycle], color: `var(--chart-${i + 1})` }]),
  );

  const activity = [
    ...(recentStudents ?? []).map((s) => ({
      icon: User,
      accent: "blue",
      title: "Nouvel élève inscrit",
      subtitle: `${s.first_name} ${s.last_name}`,
      at: s.created_at,
    })),
    ...(recentPayments ?? []).map((p) => ({
      icon: Receipt,
      accent: "green",
      title: "Paiement reçu",
      subtitle: `${Number(p.amount).toLocaleString("fr-FR")} FCFA — ${p.students?.first_name ?? ""} ${p.students?.last_name ?? ""}`,
      at: p.paid_at,
    })),
    ...(recentAnnouncements ?? []).map((a) => ({
      icon: Megaphone,
      accent: "amber",
      title: "Annonce publiée",
      subtitle: a.title,
      at: a.published_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour${membership.fullName ? ` ${membership.fullName}` : ""} 👋`}
        subtitle="Voici un aperçu de votre établissement aujourd'hui."
        actions={
          <Badge variant="secondary" className="h-8 gap-1.5 rounded-full px-3 text-sm">
            <CalendarClock className="h-3.5 w-3.5" />
            Année scolaire {currentYear?.label ?? "non définie"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={User}
          label="Élèves actifs"
          value={studentsCount ?? 0}
          accent="blue"
          href="/students"
          trend={newStudentsThisMonth ? `+${newStudentsThisMonth}` : null}
          trendLabel="ce mois-ci"
        />
        <StatCard
          icon={GraduationCap}
          label="Classes"
          value={classesCount ?? 0}
          accent="purple"
          href="/classes"
        />
        <StatCard
          icon={Wallet}
          label="Factures en attente"
          value={pendingInvoices ?? 0}
          accent="amber"
          href="/finance"
          trend={overdueInvoices ? `${overdueInvoices}` : null}
          trendLabel="en retard"
          trendDirection={overdueInvoices ? "down" : "up"}
        />
        <StatCard
          icon={CalendarClock}
          label="Année scolaire"
          value={currentYear?.label ?? "Non définie"}
          accent="green"
          badge={currentYear ? "En cours" : "À configurer"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des effectifs</CardTitle>
            <p className="text-sm text-muted-foreground">
              Élèves inscrits (cumulé) sur les 6 derniers mois
            </p>
          </CardHeader>
          <CardContent>
            <EffectifsChart data={effectifsData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par niveau</CardTitle>
            <p className="text-sm text-muted-foreground">Élèves actifs par cycle scolaire</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {totalEnrolled > 0 ? (
              <>
                <DonutChart
                  data={levelData}
                  config={levelConfig}
                  centerValue={totalEnrolled}
                  centerLabel="élèves"
                />
                <ul className="w-full space-y-1.5 text-sm">
                  {CYCLE_ORDER.map((cycle, i) => (
                    <li key={cycle} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: `var(--chart-${i + 1})` }}
                        />
                        {CYCLE_LABELS[cycle]}
                      </span>
                      <span className="font-medium">{cycleCounts[cycle]}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun élève inscrit dans une classe pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dernières activités</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length > 0 ? (
              <ul className="space-y-4">
                {activity.map((item, i) => {
                  const { fg, bg } = ACCENTS[item.accent];
                  const Icon = item.icon;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: bg, color: fg }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.at)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Événements à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun événement à venir pour l&apos;instant.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon, accent }) => {
              const isSolid = accent === "solid";
              const colors = isSolid ? null : ACCENTS[accent];
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-start gap-2 rounded-xl p-3 text-sm font-medium transition-opacity hover:opacity-90"
                  style={
                    isSolid
                      ? { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }
                      : { backgroundColor: colors.bg, color: colors.fg }
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
