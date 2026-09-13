import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import Link from "next/link";
import { formatFcfa, SUBSCRIPTION_PRICE } from "@/lib/subscription-plans";
import { getSubscriptionStatus } from "@/lib/subscription-status";
import { Download } from "lucide-react";
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
import { inviteUser, removeMembership } from "./user-actions";
import { ensureDefaultSubjects, ensureDefaultLevels } from "@/lib/school-defaults";

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
          {section === "users" && (
            <UsersSection supabase={supabase} schoolId={schoolId} membership={membership} params={params} />
          )}
          {section === "subjects" && (
            <SubjectsSection supabase={supabase} schoolId={schoolId} error={params.error} />
          )}
          {section === "levels" && (
            <LevelsSection supabase={supabase} schoolId={schoolId} error={params.error} />
          )}
        </div>
      </div>
    </div>
  );
}

async function SubscriptionSection({ supabase, membership }) {
  const [{ data: payments }, status] = await Promise.all([
    supabase
      .from("subscription_payments")
      .select("id, period_label, amount, status, created_at")
      .eq("school_id", membership.school.id)
      .order("created_at", { ascending: false })
      .limit(6),
    getSubscriptionStatus(supabase, membership.school.id),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonnement iziecole</CardTitle>
          <CardDescription>{formatFcfa(SUBSCRIPTION_PRICE)} — toutes les fonctionnalités, 30 jours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">
                {status.active ? "Abonnement actif" : "Abonnement expiré"}
              </p>
              <p className="text-xs text-muted-foreground">
                {status.active
                  ? `Renouvellement le ${status.expiresAt.toLocaleDateString("fr-FR")} (${status.daysRemaining} jours restants)`
                  : "L'accès aux autres pages est suspendu jusqu'au renouvellement."}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={status.active ? "bg-status-good/10 text-status-good" : "bg-status-critical/10 text-status-critical"}
            >
              {status.active ? "À jour" : "Expiré"}
            </Badge>
          </div>

          <form action={paySubscription}>
            <Button type="submit">
              {status.active ? "Renouveler par anticipation" : "Renouveler maintenant"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payments?.length ? (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <span className="text-muted-foreground">{p.period_label}</span>
                  <span className="flex items-center gap-2">
                    {formatFcfa(Number(p.amount))}
                    <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                      {SUBSCRIPTION_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                    {p.status === "paid" ? (
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/invoice/${p.id}`} target="_blank" aria-label="Télécharger la facture">
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré pour l&apos;instant.</p>
          )}
        </CardContent>
      </Card>
    </div>
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
          <form action={createSchoolYear} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input id="label" name="label" placeholder="2025-2026" required />
            </div>
            <Button type="submit">Ajouter</Button>
            {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

async function UsersSection({ supabase, schoolId, membership, params }) {
  const { data: members } = await supabase
    .from("memberships")
    .select("id, role, user_id, profiles(full_name, phone)")
    .eq("school_id", schoolId);

  const isAdmin = membership.role === "school_admin";

  return (
    <div className="space-y-4">
      {params.created ? (
        <Card className="border-status-good/30 bg-status-good/5">
          <CardContent className="py-4 text-sm">
            Compte créé pour <strong>{params.created}</strong>. Partagez-lui son
            e-mail et le mot de passe temporaire que vous avez défini pour qu&apos;il
            puisse se connecter sur <code>/login</code>.
          </CardContent>
        </Card>
      ) : null}

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
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                  {isAdmin && m.user_id !== membership.userId ? (
                    <form action={removeMembership}>
                      <input type="hidden" name="membershipId" value={m.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Retirer
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter un utilisateur</CardTitle>
            <CardDescription>
              Créez son compte, puis partagez-lui l&apos;e-mail et le mot de passe
              choisis ici — aucun e-mail n&apos;est envoyé automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteUser} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input id="fullName" name="fullName" required />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Enseignant</SelectItem>
                    <SelectItem value="cashier">Caissier</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="school_admin">Direction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneLocal">Téléphone</Label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                  <Input id="phoneLocal" name="phoneLocal" type="tel" inputMode="numeric" placeholder="77 123 45 67" className="pl-12" />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">Mot de passe temporaire</Label>
                <Input id="password" name="password" type="text" minLength={6} required />
              </div>
              {params.error ? <p className="text-sm text-destructive sm:col-span-2">{params.error}</p> : null}
              <div className="sm:col-span-2">
                <Button type="submit">Créer le compte</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function SubjectsSection({ supabase, schoolId, error }) {
  await ensureDefaultSubjects(supabase, schoolId);

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
  await ensureDefaultLevels(supabase, schoolId);

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
