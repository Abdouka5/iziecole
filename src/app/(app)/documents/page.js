import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/school-context";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Uploader } from "./uploader";
import { DocumentActions } from "./document-actions";

const CATEGORY_LABELS = {
  general: "Général",
  reglement: "Règlement intérieur",
  circulaire: "Circulaire",
  bulletin: "Bulletin",
  autre: "Autre",
};

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default async function DocumentsPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();
  const schoolId = membership.school.id;
  const canManage = membership.role === "school_admin" || membership.role === "teacher";

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, path, size_bytes, category, created_at, profiles(full_name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Règlement intérieur, circulaires, modèles de bulletin et autres fichiers de l'établissement."
      />

      {canManage ? <Uploader schoolId={schoolId} userId={membership.userId} /> : null}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left font-medium text-muted-foreground">Fichier</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Catégorie</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Taille</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Ajouté par</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun document pour le moment.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0">
                  <td className="flex items-center gap-2 p-3 font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {doc.name}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{CATEGORY_LABELS[doc.category] ?? doc.category}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{formatSize(doc.size_bytes)}</td>
                  <td className="p-3 text-muted-foreground">{doc.profiles?.full_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-3">
                    <DocumentActions
                      documentId={doc.id}
                      path={doc.path}
                      name={doc.name}
                      canDelete={membership.role === "school_admin"}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
