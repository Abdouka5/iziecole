import Link from "next/link";
import { Users, ShieldCheck, GraduationCap, Briefcase, Plus, Pencil } from "lucide-react";
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
import { addStaffMember, updateStaffMember, removeStaffMember } from "./actions";

const ROLE_LABELS = {
  school_admin: "Direction",
  teacher: "Enseignant",
  cashier: "Caissier",
};

const ROLE_BADGE = {
  school_admin: "bg-primary/10 text-primary",
  teacher: "bg-status-good/10 text-status-good",
  cashier: "bg-status-warning/10 text-status-warning",
};

export default async function PersonnelPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const isAdmin = membership.role === "school_admin";

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, phone")
    .eq("school_id", schoolId)
    .order("role");

  const counts = { school_admin: 0, teacher: 0, cashier: 0 };
  for (const m of staff ?? []) {
    if (m.role in counts) counts[m.role] += 1;
  }

  const editingStaff = params.edit ? (staff ?? []).find((s) => s.id === params.edit) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personnel"
        subtitle="Annuaire des enseignants, de la direction et des autres membres de l'équipe."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/personnel?new=1">
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un membre du personnel
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total personnel" value={staff?.length ?? 0} accent="blue" />
        <StatCard icon={ShieldCheck} label="Direction" value={counts.school_admin} accent="purple" />
        <StatCard icon={GraduationCap} label="Enseignants" value={counts.teacher} accent="green" />
        <StatCard icon={Briefcase} label="Autres (caissiers...)" value={counts.cashier} accent="amber" />
      </div>

      {isAdmin ? (
        <FormModal
          open={Boolean(params.new)}
          closeHref="/personnel"
          title="Ajouter un membre du personnel"
          description="Ceci ajoute une fiche à l'annuaire du personnel — aucun compte de connexion n'est créé. Pour donner un accès à l'application, utilisez le module Utilisateurs."
          footer={
            <>
              <ModalSubmitButton form="new-staff-form" pendingText="Ajout...">
                Ajouter
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/personnel">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="new-staff-form" action={addStaffMember} className="grid gap-4 py-2 sm:grid-cols-2">
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
                  <SelectItem value="school_admin">Direction</SelectItem>
                  <SelectItem value="cashier">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phoneLocal">Téléphone (optionnel)</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                <Input id="phoneLocal" name="phoneLocal" type="tel" inputMode="numeric" placeholder="77 123 45 67" className="pl-12" />
              </div>
            </div>
            {params.error ? <p className="text-sm text-destructive sm:col-span-2">{params.error}</p> : null}
          </form>
        </FormModal>
      ) : null}

      {isAdmin && editingStaff ? (
        <FormModal
          open
          closeHref="/personnel"
          title="Modifier le membre du personnel"
          footer={
            <>
              <ModalSubmitButton form="edit-staff-form" pendingText="Enregistrement...">
                Enregistrer les modifications
              </ModalSubmitButton>
              <Button variant="outline" asChild>
                <Link href="/personnel">Annuler</Link>
              </Button>
            </>
          }
        >
          <form id="edit-staff-form" action={updateStaffMember} className="grid gap-4 py-2 sm:grid-cols-2">
            <input type="hidden" name="staffId" value={editingStaff.id} />
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nom complet</Label>
              <Input id="editFullName" name="fullName" defaultValue={editingStaff.full_name} required />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select name="role" defaultValue={editingStaff.role} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Enseignant</SelectItem>
                  <SelectItem value="school_admin">Direction</SelectItem>
                  <SelectItem value="cashier">Autre</SelectItem>
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
                  defaultValue={editingStaff.phone?.replace(/^\+221/, "") ?? ""}
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
              {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(staff ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="py-10 text-center text-muted-foreground">
                  Aucun membre du personnel pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ROLE_BADGE[m.role]}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/personnel?edit=${m.id}`} aria-label={`Modifier ${m.full_name}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <form action={removeStaffMember}>
                          <input type="hidden" name="staffId" value={m.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            Retirer
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
