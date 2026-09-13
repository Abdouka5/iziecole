import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOwnProfile, updateOwnPassword } from "./actions";

export default async function AdminSettingsPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", membership.userId)
    .maybeSingle();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Vos informations de compte Super Admin.</p>
      </div>

      {params.saved ? <p className="text-sm text-status-good">Profil mis à jour.</p> : null}
      {params.passwordChanged ? <p className="text-sm text-status-good">Mot de passe modifié.</p> : null}
      {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateOwnProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" name="fullName" defaultValue={profile?.full_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneLocal">Téléphone (optionnel)</Label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">+221</span>
                <Input
                  id="phoneLocal"
                  name="phoneLocal"
                  type="tel"
                  inputMode="numeric"
                  placeholder="77 123 45 67"
                  className="pl-12"
                  defaultValue={profile?.phone?.replace(/^\+221/, "") ?? ""}
                />
              </div>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mot de passe</CardTitle>
          <CardDescription>Change le mot de passe de votre propre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateOwnPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit">Changer le mot de passe</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
