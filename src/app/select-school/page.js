import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/roles";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { selectSchool } from "./actions";

export default async function SelectSchoolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  let schools = [];
  if (profile?.is_super_admin) {
    const { data } = await supabase
      .from("schools")
      .select("id, name, slug, subscription_plan")
      .order("name");
    schools = (data ?? []).map((school) => ({ ...school, role: "super_admin" }));
  } else {
    const { data } = await supabase
      .from("memberships")
      .select("role, school:schools(id, name, slug, subscription_plan)")
      .eq("user_id", user.id);
    schools = (data ?? []).map((m) => ({ ...m.school, role: m.role }));
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-secondary/40 p-6 pt-16">
      <Logo className="text-2xl" />

      <div className="w-full max-w-md space-y-4">
        <h1 className="text-center text-lg font-heading font-semibold text-brand-ink">
          Choisissez un établissement
        </h1>

        {schools.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Aucun établissement n&apos;est associé à votre compte pour le moment.
              Contactez la direction de votre école.
            </CardContent>
          </Card>
        ) : (
          schools.map((school) => (
            <Card key={school.id}>
              <CardHeader>
                <CardTitle>{school.name}</CardTitle>
                <CardDescription>{ROLE_LABELS[school.role] ?? school.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={selectSchool.bind(null, school.id, school.role)}>
                  <Button type="submit" className="w-full">
                    Continuer
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
