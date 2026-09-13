import Link from "next/link";
import { Building2, Users, UserRound, Wallet, ArrowUpRight, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSchoolsOverview, percentChange } from "@/lib/platform-stats";
import { formatFcfa } from "@/lib/subscription-plans";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { DonutChart } from "@/components/charts/donut-chart";

const MONTH_LABELS = [
  "Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

function monthBounds(offset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  return { start, end };
}

function timeAgo(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Il y a ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  const [schools, { data: students }, { data: profiles }, { data: payments }] = await Promise.all([
    getSchoolsOverview(supabase),
    supabase.from("students").select("id, created_at"),
    supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
    supabase
      .from("subscription_payments")
      .select("school_id, amount, paid_at, schools(name)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false }),
  ]);

  const thisMonth = monthBounds(0);
  const lastMonth = monthBounds(1);

  const countInRange = (rows, dateKey, { start, end }) =>
    rows.filter((r) => {
      const d = new Date(r[dateKey]);
      return d >= start && d < end;
    }).length;

  const schoolsThisMonth = countInRange(schools, "created_at", thisMonth);
  const schoolsLastMonth = countInRange(schools, "created_at", lastMonth);
  const studentsThisMonth = countInRange(students ?? [], "created_at", thisMonth);
  const studentsLastMonth = countInRange(students ?? [], "created_at", lastMonth);
  const usersThisMonth = countInRange(profiles ?? [], "created_at", thisMonth);
  const usersLastMonth = countInRange(profiles ?? [], "created_at", lastMonth);
  const revenueThisMonth = (payments ?? [])
    .filter((p) => new Date(p.paid_at) >= thisMonth.start && new Date(p.paid_at) < thisMonth.end)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const revenueLastMonth = (payments ?? [])
    .filter((p) => new Date(p.paid_at) >= lastMonth.start && new Date(p.paid_at) < lastMonth.end)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const months = Array.from({ length: 6 }, (_, i) => monthBounds(5 - i));
  const evolutionData = months.map(({ start, end }) => ({
    month: `${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`,
    schools: schools.filter((s) => new Date(s.created_at) < end).length,
  }));
  const evolutionConfig = { schools: { label: "Établissements", color: "#4c8ef7" } };

  const activeCount = schools.filter((s) => s.subscription.active).length;
  const expiredCount = schools.length - activeCount;
  const statusData = [
    { name: "Actif", value: activeCount, fill: "#22c55e" },
    { name: "Expiré", value: expiredCount, fill: "#ef4444" },
  ].filter((d) => d.value > 0);
  const statusConfig = {
    Actif: { label: "Actif", color: "#22c55e" },
    Expiré: { label: "Expiré", color: "#ef4444" },
  };

  const recentSchools = schools.slice(0, 5);

  const activity = [
    ...schools.slice(0, 3).map((s) => ({
      icon: Building2,
      accent: "bg-blue-100 text-blue-600",
      title: "Nouvelle école inscrite",
      subtitle: s.name,
      at: s.created_at,
    })),
    ...(payments ?? []).slice(0, 3).map((p) => ({
      icon: Wallet,
      accent: "bg-green-100 text-green-600",
      title: "Paiement reçu",
      subtitle: `${formatFcfa(Number(p.amount))} — ${p.schools?.name ?? ""}`,
      at: p.paid_at,
    })),
    ...(profiles ?? []).slice(0, 3).map((p) => ({
      icon: UserRound,
      accent: "bg-purple-100 text-purple-600",
      title: "Utilisateur créé",
      subtitle: p.full_name ?? "Sans nom",
      at: p.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  let dbOperational = true;
  try {
    await supabase.from("platform_settings").select("id").limit(1);
  } catch {
    dbOperational = false;
  }
  const paymentServiceConfigured = Boolean(process.env.PAYTECH_API_KEY && process.env.PAYTECH_SECRET_KEY);

  const platformStatus = [
    { label: "API", ok: true, detail: "Opérationnel" },
    { label: "Base de données", ok: dbOperational, detail: dbOperational ? "Opérationnel" : "Indisponible" },
    { label: "Service de paiement (PayTech)", ok: paymentServiceConfigured, detail: paymentServiceConfigured ? "Configuré" : "Non configuré" },
    { label: "Emails transactionnels", ok: false, detail: "Non implémenté — comptes créés avec mot de passe temporaire" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bonjour 👋</h1>
          <p className="text-sm text-muted-foreground">Voici un aperçu global de votre plateforme iziecole</p>
        </div>
        <Button asChild>
          <Link href="/admin/schools?new=1">Ajouter une école</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          icon={Building2}
          label="Établissements"
          value={schools.length}
          trend={schoolsLastMonth || schoolsThisMonth ? `${percentChange(schoolsThisMonth, schoolsLastMonth)}%` : null}
          accent="blue"
        />
        <AdminStatCard
          icon={Users}
          label="Élèves"
          value={(students ?? []).length.toLocaleString("fr-FR")}
          trend={studentsLastMonth || studentsThisMonth ? `${percentChange(studentsThisMonth, studentsLastMonth)}%` : null}
          accent="green"
        />
        <AdminStatCard
          icon={UserRound}
          label="Utilisateurs"
          value={(profiles ?? []).length.toLocaleString("fr-FR")}
          trend={usersLastMonth || usersThisMonth ? `${percentChange(usersThisMonth, usersLastMonth)}%` : null}
          accent="purple"
        />
        <AdminStatCard
          icon={Wallet}
          label="Revenus du mois"
          value={formatFcfa(revenueThisMonth)}
          trend={revenueLastMonth || revenueThisMonth ? `${percentChange(revenueThisMonth, revenueLastMonth)}%` : null}
          accent="orange"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des établissements</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={evolutionData} config={evolutionConfig} dataKey="schools" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {statusData.length > 0 ? (
              <>
                <DonutChart data={statusData} config={statusConfig} centerValue={schools.length} centerLabel="établissements" />
                <ul className="w-full space-y-1.5 text-sm">
                  {statusData.map((d) => (
                    <li key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-medium">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune école pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Établissements récents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/schools">
                Voir tous <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead>Élèves</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Aucune école inscrite pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSchools.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.adminName ?? "—"}</TableCell>
                      <TableCell>{s.studentCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={s.subscription.active ? "bg-status-good/10 text-status-good" : "bg-status-critical/10 text-status-critical"}
                        >
                          {s.subscription.active ? "Actif" : "Expiré"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/schools`} aria-label={`Voir ${s.name}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-4">
                {activity.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.accent}`}>
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
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">État de la plateforme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {platformStatus.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{s.label}</span>
              <span className={`flex items-center gap-1.5 font-medium ${s.ok ? "text-status-good" : "text-muted-foreground"}`}>
                <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-status-good" : "bg-muted-foreground"}`} />
                {s.detail}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
