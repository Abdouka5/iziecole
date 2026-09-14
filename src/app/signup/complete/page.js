import { redirect } from "next/navigation";
import { Building2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeGoogleSignup } from "./actions";

export default async function CompleteSignupPage({ searchParams }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-20 w-auto" />
          <h1 className="text-xl font-bold text-foreground">Plus qu&apos;une étape</h1>
          <p className="text-sm text-muted-foreground">
            Renseignez le nom de votre établissement pour terminer votre inscription.
          </p>
        </div>

        <form action={completeGoogleSignup} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="schoolName">Nom de l&apos;établissement</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="schoolName" name="schoolName" required className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneLocal">Téléphone (optionnel)</Label>
            <div className="relative flex items-center">
              <Phone className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <span className="pointer-events-none absolute left-9 text-sm text-muted-foreground">+221</span>
              <Input
                id="phoneLocal"
                name="phoneLocal"
                type="tel"
                inputMode="numeric"
                placeholder="77 123 45 67"
                className="pl-[4.5rem]"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <SubmitButton className="w-full" pendingText="Finalisation...">
            Terminer l&apos;inscription
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
