import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ModalSubmitButton } from "@/components/ui/modal-submit-button";
import { FormPendingBridge } from "@/components/ui/form-pending-bridge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormModal } from "@/components/layout/form-modal";
import { createPlatformAnnouncement, togglePlatformAnnouncement, deletePlatformAnnouncement } from "./actions";

export default async function AdminContentPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("platform_announcements")
    .select("id, title, body, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contenu</h1>
          <p className="text-sm text-muted-foreground">
            Annonces affichées à toutes les écoles (maintenance, nouveautés...).
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/content?new=1">
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle annonce
          </Link>
        </Button>
      </div>

      <FormModal
        open={Boolean(params.new)}
        closeHref="/admin/content"
        title="Nouvelle annonce plateforme"
        description="Visible par tous les membres connectés, de toutes les écoles."
        footer={
          <>
            <ModalSubmitButton form="new-announcement-form" pendingText="Publication...">
              Publier
            </ModalSubmitButton>
            <Button variant="outline" asChild>
              <Link href="/admin/content">Annuler</Link>
            </Button>
          </>
        }
      >
        <form id="new-announcement-form" action={createPlatformAnnouncement} className="space-y-4 py-2">
          <FormPendingBridge />
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" placeholder="Maintenance prévue le 20 septembre" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={4} required />
          </div>
          {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
        </form>
      </FormModal>

      <div className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aucune annonce publiée pour le moment.
            </CardContent>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="secondary" className={a.active ? "bg-status-good/10 text-status-good" : "bg-muted text-muted-foreground"}>
                      {a.active ? "Active" : "Désactivée"}
                    </Badge>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publiée le {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <form action={togglePlatformAnnouncement}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={(!a.active).toString()} />
                    <Button type="submit" variant="outline" size="sm">
                      {a.active ? "Désactiver" : "Activer"}
                    </Button>
                  </form>
                  <form action={deletePlatformAnnouncement}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
