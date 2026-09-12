import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PLAN_LABELS, PLAN_PRICES, formatFcfa } from "@/lib/subscription-plans";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SettingsNav } from "./settings-nav";
import { paySubscription } from "./actions";
import {
  updateSchoolInfo,
  createSchoolYear,
  setCurrentSchoolYear,
  createLevel,
  createSubject,
} from "./school-actions";

const SUBSCRIPTION_STATUS_LABELS = {
  pending: "En attente",
  paid: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
};

const CYCLE_OPTIONS = [
  { value: "maternelle", label: "Maternelle" },
  { value: "primaire", label: "Primaire" },
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
];

const ROLE_LABELS = {
  school_admin: "Direction",
  teacher: "Enseignant",
  cashier: "Caissier",
  parent: "Parent",
  student: "Élève",
};

function ComingSoon({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Bientôt disponible.
      </CardContent>
    </Card>
  );
}

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const section = params.section ?? "subscription";
  const membership = await getCurrentMembership();
  if (membership.role !== "school_admin" && membership.role !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const schoolId = membership.school.id;

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Personnalisez votre établissement et gérez vos préférences." />

      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav active={section} />

        <div className="flex-1 space-y-4">
          {section === "subscription" && (
            <SubscriptionSection supabase={supabase} membership={membership} />
          )}
          {section === "general" && <GeneralSection membership={membership} />}
          {section === "year" && (
            <YearSection supabase={supabase} schoolId={schoolId} error={params.error} />
          )}
          {section === "users" && <UsersSection supabase={supabase} schoolId={schoolId} />}
          {section === "subjects" && (
            <SubjectsSection supabase={supabase} schoolId={schoolId} error={params.error} />
          )}
          {section === "levels" && (
            <LevelsSection supabase={supabase} schoolId={schoolId} error={params.error} />
          )}
          {section === "notifications" && (
            <ComingSoon title="Notifications" description="Préférences email, SMS et alertes." />
          )}
          {section === "backup" && (
            <ComingSoon title="Sauvegarde" description="Export et restauration des données." />
          )}
          {section === "security" && (
            <ComingSoon title="Sécurité" description="Accès et confidentialité." />
          )}
          {section === "import-export" && (
            <ComingSoon title="Import / Export" description="Gestion des données en masse." />
          )}
        </div>
      </div>
    </div>
  );
}

async function SubscriptionSection({ supabase, membership }) {
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("id, period_label, amount, status, created_at")
    .eq("school_id", membership.school.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const plan = membership.school.subscription_plan;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Abonnement iziecole</CardTitle>
        <CardDescription>
          {PLAN_LABELS[plan]} — {formatFcfa(PLAN_PRICES[plan])}/mois
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={paySubscription}>
          <Button type="submit">Payer l&apos;abonnement de ce mois</Button>
        </form>

        {payments?.length ? (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Derniers paiements</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.period_label}</span>
                  <span className="flex items-center gap-2">
                    {formatFcfa(Number(p.amount))}
                    <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                      {SUBSCRIPTION_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun paiement enregistré pour l&apos;instant.</p>
        )}
      </CardContent>
    </Card>
  );
}

function GeneralSection({ membership }) {
  const { school } = membership;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informations générales</CardTitle>
        <CardDescription>Modifiez les informations principales de votre établissement.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateSchoolInfo} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nom de l&apos;établissement</Label>
            <Input id="name" name="name" defaultValue={school.name} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" defaultValue={school.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" defaultValue={school.phone ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Enregistrer les modifications</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

async function YearSection({ supabase, schoolId, error }) {
  const { data: years } = await supabase
    .from("school_years")
    .select("id, label, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Années scolaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(years ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune année scolaire configurée.</p>
          ) : (
            years.map((y) => (
              <div key={y.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{y.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(y.start_date).toLocaleDateString("fr-FR")} — {new Date(y.end_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {y.is_current ? (
                  <Badge className="bg-status-good/10 text-status-good" variant="secondary">En cours</Badge>
                ) : (
                  <form action={setCurrentSchoolYear}>
                    <input type="hidden" name="yearId" value={y.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Définir comme actuelle
                    </Button>
                  </form>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une année scolaire</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSchoolYear} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input id="label" name="label" placeholder="2025-2026" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Début</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fin</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-3">{error}</p> : null}
            <div className="sm:col-span-3">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersSection({ supabase, schoolId }) {
  const { data: members } = await supabase
    .from("memberships")
    .select("id, role, profiles(full_name, phone)")
    .eq("school_id", schoolId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Utilisateurs</CardTitle>
        <CardDescription>Comptes ayant accès à cet établissement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(members ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun utilisateur pour le moment.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{m.profiles?.full_name ?? "Sans nom"}</p>
                <p className="text-xs text-muted-foreground">{m.profiles?.phone ?? "—"}</p>
              </div>
              <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
            </div>
          ))
        )}
        <p className="pt-2 text-sm text-muted-foreground">
          L&apos;invitation de nouveaux utilisateurs par e-mail arrive bientôt.
        </p>
      </CardContent>
    </Card>
  );
}

async function SubjectsSection({ supabase, schoolId, error }) {
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("school_id", schoolId)
    .order("name");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matières</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(subjects ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune matière pour le moment.</p>
          ) : (
            subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{s.name}</span>
                {s.code ? <Badge variant="secondary">{s.code}</Badge> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter une matière</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSubject} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="subjectName">Nom</Label>
              <Input id="subjectName" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectCode">Code</Label>
              <Input id="subjectCode" name="code" placeholder="MATH" />
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-3">{error}</p> : null}
            <div className="sm:col-span-3">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

async function LevelsSection({ supabase, schoolId, error }) {
  const { data: levels } = await supabase
    .from("levels")
    .select("id, name, cycle")
    .eq("school_id", schoolId)
    .order("display_order");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Niveaux scolaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(levels ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun niveau pour le moment.</p>
          ) : (
            levels.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{l.name}</span>
                <Badge variant="secondary">{CYCLE_OPTIONS.find((c) => c.value === l.cycle)?.label ?? l.cycle}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un niveau</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLevel} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="levelName">Nom</Label>
              <Input id="levelName" name="name" placeholder="6ème" required />
            </div>
            <div className="space-y-2">
              <Label>Cycle</Label>
              <Select name="cycle" required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-3">{error}</p> : null}
            <div className="sm:col-span-3">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
