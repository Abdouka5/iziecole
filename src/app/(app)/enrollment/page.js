import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { GuardianFields } from "@/app/(app)/students/guardian-fields";
import { BirthDateFields } from "@/app/(app)/students/birth-date-fields";
import { createStudent } from "@/app/(app)/students/actions";

// A dedicated full-page version of the "Nouvel élève" modal (same form,
// same createStudent action — a new student here is the same students row,
// so it shows up in Élèves immediately), for a front-desk workflow that's
// enrolling students one after another rather than managing an existing
// roster. Redirects back to itself on success instead of to /students, so
// the next enrollment doesn't need an extra navigation.
export default async function EnrollmentPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inscription"
        subtitle="Enregistrez un nouvel élève et affectez-le à une classe."
      />

      {params.success ? (
        <Card className="border-status-good/30 bg-status-good/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>Élève inscrit avec succès.</span>
            <Link href="/students" className="font-medium text-primary hover:underline">
              Voir la liste des élèves
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <form action={createStudent} className="space-y-5">
            <input type="hidden" name="successPath" value="/enrollment?success=1" />
            <input type="hidden" name="errorPath" value="/enrollment" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" name="lastName" required />
              </div>
              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <BirthDateFields />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthPlace">Lieu de naissance</Label>
                <Input id="birthPlace" name="birthPlace" placeholder="Dakar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Genre</Label>
                <Select name="gender">
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Garçon</SelectItem>
                    <SelectItem value="F">Fille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" name="address" placeholder="Quartier, ville" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="classId">Classe (optionnel)</Label>
                <Select name="classId">
                  <SelectTrigger id="classId" className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parents / Responsables</Label>
              <GuardianFields />
            </div>

            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}

            <SubmitButton pendingText="Inscription...">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Inscrire l&apos;élève
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
