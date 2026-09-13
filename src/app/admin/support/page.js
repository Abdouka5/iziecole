import { LifeBuoy, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toggleTicketStatus } from "./actions";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, created_at, schools(name), profiles(full_name)")
    .order("created_at", { ascending: false });

  const open = (tickets ?? []).filter((t) => t.status === "open");
  const resolved = (tickets ?? []).filter((t) => t.status === "resolved");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground">Demandes envoyées par les écoles.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard icon={LifeBuoy} label="Total demandes" value={tickets?.length ?? 0} accent="blue" />
        <AdminStatCard icon={Clock} label="En cours" value={open.length} accent="orange" />
        <AdminStatCard icon={CheckCircle2} label="Résolues" value={resolved.length} accent="green" />
      </div>

      <div className="space-y-3">
        {(tickets ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune demande de support pour le moment.
            </CardContent>
          </Card>
        ) : (
          tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.subject}</p>
                    <Badge
                      variant="secondary"
                      className={t.status === "resolved" ? "bg-status-good/10 text-status-good" : "bg-status-warning/10 text-status-warning"}
                    >
                      {t.status === "resolved" ? "Résolu" : "En cours"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.schools?.name ?? "—"} · {t.profiles?.full_name ?? "Sans nom"} ·{" "}
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.message}</p>
                </div>
                <form action={toggleTicketStatus}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="status" value={t.status === "resolved" ? "open" : "resolved"} />
                  <Button type="submit" variant="outline" size="sm">
                    {t.status === "resolved" ? "Rouvrir" : "Marquer résolu"}
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
