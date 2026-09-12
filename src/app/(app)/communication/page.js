import Link from "next/link";
import { Megaphone, Mail, Plus, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timeAgo } from "@/lib/time";
import { createAnnouncement, sendMessage } from "./actions";

export default async function CommunicationPage({ searchParams }) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const tab = params.tab ?? "announcements";

  const [{ data: announcements }, { data: messages }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, published_at, profiles(full_name)")
      .eq("school_id", schoolId)
      .order("published_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, subject, body, read_at, created_at, sender_id, recipient_id, sender:profiles!messages_sender_id_fkey(full_name), recipient:profiles!messages_recipient_id_fkey(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  let coMembers = [];
  if (membership.role === "school_admin") {
    const { data } = await supabase
      .from("memberships")
      .select("user_id, profiles(full_name)")
      .eq("school_id", schoolId)
      .neq("user_id", membership.userId);
    coMembers = data ?? [];
  }

  const canPublish = membership.role === "school_admin" || membership.role === "teacher";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        subtitle="Annonces à l'école, messagerie et notifications."
        actions={
          canPublish ? (
            <Button asChild>
              <Link href="/communication?newAnnouncement=1">
                <Plus className="mr-1.5 h-4 w-4" />
                Nouvelle annonce
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex overflow-hidden rounded-lg border w-fit">
        <Link
          href="/communication?tab=announcements"
          className={`px-4 py-2 text-sm font-medium ${tab === "announcements" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <Megaphone className="mr-1.5 inline h-4 w-4" />
          Annonces
        </Link>
        <Link
          href="/communication?tab=messages"
          className={`border-l px-4 py-2 text-sm font-medium ${tab === "messages" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          <Mail className="mr-1.5 inline h-4 w-4" />
          Messages
        </Link>
      </div>

      {tab === "announcements" ? (
        <div className="space-y-4">
          {params.newAnnouncement ? (
            <Card>
              <CardHeader>
                <CardTitle>Nouvelle annonce</CardTitle>
                <CardDescription>Visible par tous les membres de l&apos;établissement.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createAnnouncement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Message</Label>
                    <Textarea id="body" name="body" required rows={4} />
                  </div>
                  {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
                  <div className="flex gap-2">
                    <Button type="submit">Publier</Button>
                    <Button variant="outline" asChild>
                      <Link href="/communication">Annuler</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {(announcements ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucune annonce publiée pour le moment.
              </CardContent>
            </Card>
          ) : (
            announcements.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <Badge variant="secondary">{timeAgo(a.published_at)}</Badge>
                  </div>
                  <CardDescription>Par {a.profiles?.full_name ?? "Direction"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90">{a.body}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {membership.role === "school_admin" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nouveau message</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={sendMessage} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Destinataire</Label>
                    <Select name="recipientId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un destinataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {coMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.profiles?.full_name ?? "Utilisateur"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet</Label>
                    <Input id="subject" name="subject" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="msgBody">Message</Label>
                    <Textarea id="msgBody" name="body" required rows={3} />
                  </div>
                  {params.error ? <p className="text-sm text-destructive">{params.error}</p> : null}
                  <Button type="submit">
                    <Send className="mr-1.5 h-4 w-4" />
                    Envoyer
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium text-muted-foreground">De / À</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Sujet</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(messages ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground">
                      Aucun message pour le moment.
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => {
                    const isSent = m.sender_id === membership.userId;
                    return (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="p-3">
                          {isSent ? `À ${m.recipient?.full_name ?? "—"}` : `De ${m.sender?.full_name ?? "—"}`}
                        </td>
                        <td className="p-3">{m.subject || "(sans sujet)"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3">
                          {!isSent && !m.read_at ? (
                            <Badge className="bg-primary/10 text-primary" variant="secondary">Non lu</Badge>
                          ) : (
                            <Badge variant="secondary">Lu</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
