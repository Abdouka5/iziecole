import Link from "next/link";
import { Building2, GraduationCap, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PLAN_LABELS } from "@/lib/subscription-plans";
import { cn } from "@/lib/utils";
import { signUpSchool } from "./actions";

const selectClassName = cn(
  "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent pl-9 pr-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

export default async function SignupPage({ searchParams }) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="text-3xl" />
          <p className="text-sm text-muted-foreground">
            La gestion scolaire, simplifiée
          </p>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-lg font-heading font-semibold text-brand-ink">
            Créer votre compte école
          </h1>
          <p className="text-sm text-muted-foreground">
            Simplifiez la gestion de votre établissement avec iziecole.
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
            <Label htmlFor="plan">Niveau de l&apos;établissement</Label>
            <div className="relative">
              <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select id="plan" name="plan" required defaultValue="" className={selectClassName}>
                <option value="" disabled>
                  Choisissez un niveau
                </option>
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
