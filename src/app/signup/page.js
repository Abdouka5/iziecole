import Link from "next/link";
import { Building2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { formatFcfa } from "@/lib/subscription-plans";
import { getPlatformSettings } from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";
import { signUpSchool } from "./actions";

export default async function SignupPage({ searchParams }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { subscriptionPrice, subscriptionDurationDays } = await getPlatformSettings(supabase);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-20 w-auto" />
          <p className="text-sm text-muted-foreground">
            La gestion scolaire, simplifiée
          </p>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Créer votre compte école
          </h1>
          <p className="text-sm text-muted-foreground">
            Simplifiez la gestion de votre établissement avec iziecole.
          </p>
          <p className="text-xs font-medium text-primary">
            {formatFcfa(subscriptionPrice)} — toutes les fonctionnalités, {subscriptionDurationDays} jours
          </p>
        </div>

        <form
          action={signUpSchool}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="schoolName">Nom de l&apos;établissement</Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="schoolName" name="schoolName" required className="pl-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail de l&apos;administrateur</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneLocal">Numéro de téléphone</Label>
            <div className="relative flex items-center">
              <Phone className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <span className="pointer-events-none absolute left-9 text-sm text-muted-foreground">
                +221
              </span>
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

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full">
            Créer mon compte
          </Button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleAuthButton label="S'inscrire avec Google" />

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
