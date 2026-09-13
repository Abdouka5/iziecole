import Link from "next/link";
import { Plus, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSchoolsOverview } from "@/lib/platform-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormModal } from "@/components/layout/form-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSchool, viewSchoolDashboard } from "./actions";
import { DeleteSchoolButton } from "./delete-school-button";

export default async function AdminSchoolsPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const schools = await getSchoolsOverview(supabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Établissements</h1>
          <p className="text-sm text-muted-foreground">Toutes les écoles inscrites sur iziecole.</p>
        </div>
        <Button asChild>
          <Link href="/admin/schools?new=1">
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter une école
          </Link>
        </Button>
      </div>

      {params.created ? (
        <Card className="border-status-good/30 bg-status-good/5">
          <CardContent className="py-4 text-sm">
            École créée. Compte administrateur : <strong>{params.created}</strong>. Partagez-lui
            son e-mail et le mot de passe choisis pour qu&apos;il se connecte sur <code>/login</code>.
          </CardContent>
        </Card>
      ) : null}

      <FormModal
        open={Boolean(params.new)}
        closeHref="/admin/schools"
        title="Ajouter une école"
        description="Crée l'établissement et le compte de son premier administrateur."
        footer={
          <>
            <Button type="submit" form="new-school-form">
              Créer l&apos;école
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/schools">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-school-form" action={createSchool} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="schoolName">Nom de l&apos;établissement</Label>
            <Input id="schoolName" name="schoolName" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminFullName">Nom de l&apos;administrateur</Label>
              <Input id="adminFullName" name="adminFullName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">E-mail</Label>
              <Input id="adminEmail" name="adminEmail" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPhoneLocal">Téléphone (optionnel)</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                <Input id="adminPhoneLocal" name="adminPhoneLocal" type="tel" inputMode="numeric" placeholder="77 123 45 67" className="pl-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Mot de passe</Label>
              <Input id="adminPassword" name="adminPassword" type="text" minLength={6} required />
            </div>
          </div>
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Établissement</TableHead>
              <TableHead>Administrateur</TableHead>
              <TableHead>Élèves</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscrite le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucune école pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell className="text-muted-foreground">{school.adminName ?? "—"}</TableCell>
                  <TableCell>{school.studentCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={school.subscription.active ? "bg-status-good/10 text-status-good" : "bg-status-critical/10 text-status-critical"}
                    >
                      {school.subscription.active ? `Actif (${school.subscription.daysRemaining} j.)` : "Expiré"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(school.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <form action={viewSchoolDashboard}>
                        <input type="hidden" name="schoolId" value={school.id} />
                        <Button type="submit" variant="ghost" size="icon" aria-label={`Voir le tableau de bord de ${school.name}`}>
                          <LogIn className="h-4 w-4" />
                        </Button>
                      </form>
                      <DeleteSchoolButton schoolId={school.id} schoolName={school.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
