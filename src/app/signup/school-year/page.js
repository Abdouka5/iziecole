import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFirstSchoolYear } from "./actions";

export default async function SchoolYearSetupPage({ searchParams }) {
  const { error } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = await createClient();
  const { count } = await supabase
    .from("school_years")
    .select("id", { count: "exact", head: true })
    .eq("school_id", membership.school.id);
  if (count) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-20 w-auto" />
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Étape 2 sur 2</p>
          <h1 className="text-xl font-bold text-foreground">Configurez votre première année scolaire</h1>
          <p className="text-sm text-muted-foreground">
            Les autres informations de l&apos;établissement (adresse, téléphone, logo) se
            complètent à tout moment depuis Paramètres.
          </p>
        </div>

        <form action={createFirstSchoolYear} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="label">Année scolaire</Label>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="label" name="label" placeholder="2025-2026" required className="pl-9" />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full">
            Continuer
          </Button>
        </form>

        <p className="text-center">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">
            Ignorer cette étape
          </Link>
        </p>
      </div>
    </div>
  );
}
