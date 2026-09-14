import { Users, ShieldCheck, GraduationCap, Ban, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPeriodRange, inPeriod } from "@/lib/period-filter";
import { PeriodFilter } from "@/components/layout/period-filter";
import { AdminStatCard } from "@/components/layout/admin-stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleUserSuspension } from "./actions";
import { RemoveUserButton } from "./remove-user-button";

const ROLE_LABELS = {
  school_admin: "Direction",
  teacher: "Enseignant",
  cashier: "Caissier",
  parent: "Parent",
  student: "Élève",
};

const ROLE_BADGE = {
  school_admin: "bg-primary/10 text-primary",
  teacher: "bg-status-good/10 text-status-good",
  cashier: "bg-status-warning/10 text-status-warning",
  parent: "bg-purple-100 text-purple-700",
  student: "bg-pink-100 text-pink-700",
};

export default async function AdminUsersPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: allUsers } = await supabase
    .from("memberships")
    .select("id, role, user_id, suspended, created_at, profiles(full_name, phone), schools(name)")
    .order("role");

  let users = allUsers ?? [];
  if (params.q) {
    const q = params.q.toString().toLowerCase();
    users = users.filter((m) => (m.profiles?.full_name ?? "").toLowerCase().includes(q));
  }
  const range = getPeriodRange(params.period ?? "all");
  if (range.start) {
    users = users.filter((m) => inPeriod(m.created_at, range));
  }

  const counts = { school_admin: 0, teacher: 0, other: 0 };
  for (const m of users) {
    if (m.role === "school_admin") counts.school_admin += 1;
    else if (m.role === "teacher") counts.teacher += 1;
    else counts.other += 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Tous les comptes, toutes écoles confondues.</p>
        </div>
        <PeriodFilter />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard icon={Users} label="Total comptes" value={users?.length ?? 0} accent="blue" />
        <AdminStatCard icon={ShieldCheck} label="Direction" value={counts.school_admin} accent="purple" />
        <AdminStatCard icon={GraduationCap} label="Enseignants" value={counts.teacher} accent="green" />
        <AdminStatCard icon={Users} label="Autres" value={counts.other} accent="orange" />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>École</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              users.map((m) => {
                const userName = m.profiles?.full_name ?? "Sans nom";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{userName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.schools?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_BADGE[m.role]}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.suspended ? (
                        <Badge variant="secondary" className="bg-status-critical/10 text-status-critical">
                          Suspendu
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-status-good/10 text-status-good">
                          Actif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <form action={toggleUserSuspension}>
                          <input type="hidden" name="membershipId" value={m.id} />
                          <input type="hidden" name="suspended" value={(!m.suspended).toString()} />
                          <Button type="submit" variant="ghost" size="icon" aria-label={m.suspended ? `Réactiver ${userName}` : `Suspendre ${userName}`}>
                            {m.suspended ? <PlayCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                        </form>
                        <RemoveUserButton membershipId={m.id} userName={userName} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
