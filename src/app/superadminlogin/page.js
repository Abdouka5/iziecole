import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { superAdminSignIn } from "./actions";

export default async function SuperAdminLoginPage({ searchParams }) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-white.png" alt="iziecole" className="h-10 w-auto" />
          <p className="flex items-center gap-1.5 text-sm text-white/50">
            <ShieldCheck className="h-4 w-4" />
            Console Super Admin
          </p>
        </div>

        <form action={superAdminSignIn} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
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
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full">
            Se connecter
          </Button>
        </form>

        <p className="text-center text-xs text-white/30">
          Réservé aux comptes Super Admin d&apos;iziecole.
        </p>
      </div>
    </div>
  );
}
