import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicket } from "./actions";

export default async function SupportPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, created_at")
    .eq("school_id", membership.school.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Support" subtitle="Une question, un problème ? Contactez l'équipe iziecole." />

      {params.sent ? <p className="text-sm text-status-good">Votre message a été envoyé.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouveau message</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" rows={5} required />
            </div>
            {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
            <Button type="submit">Envoyer</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Vos demandes précédentes</h2>
        {(tickets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande envoyée pour le moment.</p>
        ) : (
          tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t.subject}</p>
                  <Badge
                    variant="secondary"
                    className={t.status === "resolved" ? "bg-status-good/10 text-status-good" : "bg-status-warning/10 text-status-warning"}
                  >
                    {t.status === "resolved" ? "Résolu" : "En cours"}
                  </Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("fr-FR")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
