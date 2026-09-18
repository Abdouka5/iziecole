import Link from "next/link";
import { KeyRound, ShieldCheck, GraduationCap, Users2, Plus, Pencil, Ban, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { FormModal } from "@/components/layout/form-modal";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PasswordField } from "./password-field";
import { RemoveUserButton } from "./remove-user-button";
import { inviteUser, updateUserAccount, toggleUserSuspension } from "./actions";

const ROLE_LABELS = {
  school_admin: "Direction",
  teacher: "Enseignant",
  cashier: "Caissier",
  parent: "Parent",
  student: "Élève",
};

const ROLE_BADGE = {
  school_admin: "bg-primary/10 text-primary",
  teacher: "bg-status-good/10 text-status-good",
  cashier: "bg-status-warning/10 text-status-warning",
  parent: "bg-purple-100 text-purple-700",
  student: "bg-pink-100 text-pink-700",
};

export default async function UsersPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const isAdmin = membership.role === "school_admin";

  const { data: users } = await supabase
    .from("memberships")
    .select("id, role, user_id, suspended, profiles(full_name, phone)")
    .eq("school_id", schoolId)
    .order("role");

  const counts = { school_admin: 0, teacher: 0, other: 0 };
  for (const m of users ?? []) {
    if (m.role === "school_admin") counts.school_admin += 1;
    else if (m.role === "teacher") counts.teacher += 1;
    else counts.other += 1;
  }

  const editingUser = params.edit ? (users ?? []).find((u) => u.id === params.edit) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        subtitle="Créez et gérez les comptes qui ont accès à l'application."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/users?new=1">
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un utilisateur
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={KeyRound} label="Total comptes" value={users?.length ?? 0} accent="blue" />
        <StatCard icon={ShieldCheck} label="Direction" value={counts.school_admin} accent="purple" />
        <StatCard icon={GraduationCap} label="Enseignants" value={counts.teacher} accent="green" />
        <StatCard icon={Users2} label="Autres (parents...)" value={counts.other} accent="amber" />
      </div>

      {params.created ? (
        <Card className="border-status-good/30 bg-status-good/5">
          <CardContent className="py-4 text-sm">
            Compte créé pour <strong>{params.created}</strong>. Partagez-lui son
            e-mail et le mot de passe choisis pour qu&apos;il puisse se
            connecter sur <code>/login</code>.
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <FormModal
          open={Boolean(params.new)}
          closeHref="/users"
          title="Ajouter un utilisateur"
          description="Créez son compte, puis partagez-lui l'e-mail et le mot de passe choisis ici — aucun e-mail n'est envoyé automatiquement."
          footer={
            <>
              <ModalSubmitButton form="new-user-form" pendingText="Création...">
                Créer le compte
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/users">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="new-user-form" action={inviteUser} className="grid gap-4 py-2 sm:grid-cols-2">
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
              <Label htmlFor="phoneLocal">Téléphone (optionnel)</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                <Input id="phoneLocal" name="phoneLocal" type="tel" inputMode="numeric" placeholder="77 123 45 67" className="pl-12" />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Mot de passe</Label>
              <PasswordField id="password" name="password" />
            </div>
            {params.error ? <p className="text-sm text-destructive sm:col-span-2">{params.error}</p> : null}
          </form>
        </FormModal>
      ) : null}

      {isAdmin && editingUser ? (
        <FormModal
          open
          closeHref="/users"
          title="Modifier l'utilisateur"
          description="L'adresse e-mail de connexion ne peut pas être modifiée ici."
          footer={
            <>
              <ModalSubmitButton form="edit-user-form" pendingText="Enregistrement...">
                Enregistrer les modifications
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/users">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="edit-user-form" action={updateUserAccount} className="grid gap-4 py-2 sm:grid-cols-2">
            <input type="hidden" name="membershipId" value={editingUser.id} />
            <input type="hidden" name="userId" value={editingUser.user_id} />
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nom complet</Label>
              <Input id="editFullName" name="fullName" defaultValue={editingUser.profiles?.full_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select name="role" defaultValue={editingUser.role} required>
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="editPhoneLocal">Téléphone (optionnel)</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                <Input
                  id="editPhoneLocal"
                  name="phoneLocal"
                  type="tel"
                  inputMode="numeric"
                  placeholder="77 123 45 67"
                  className="pl-12"
                  defaultValue={editingUser.profiles?.phone?.replace(/^\+221/, "") ?? ""}
                />
              </div>
            </div>
            {params.error ? <p className="text-sm text-destructive sm:col-span-2">{params.error}</p> : null}
          </form>
        </FormModal>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              users.map((m) => {
                const isSelf = m.user_id === membership.userId;
                const userName = m.profiles?.full_name ?? "Sans nom";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{userName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.profiles?.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_BADGE[m.role]}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.suspended ? (
                        <Badge variant="secondary" className="bg-status-critical/10 text-status-critical">
                          Suspendu
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-status-good/10 text-status-good">
                          Actif
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/users?edit=${m.id}`} aria-label={`Modifier ${userName}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {!isSelf ? (
                            <>
                              <form action={toggleUserSuspension}>
                                <input type="hidden" name="membershipId" value={m.id} />
                                <input type="hidden" name="suspended" value={(!m.suspended).toString()} />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={m.suspended ? `Réactiver ${userName}` : `Suspendre ${userName}`}
                                >
                                  {m.suspended ? <PlayCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                </Button>
                              </form>
                              <RemoveUserButton membershipId={m.id} userName={userName} />
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
