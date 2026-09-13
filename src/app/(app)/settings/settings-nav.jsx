import Link from "next/link";
import {
  CreditCard,
  Building2,
  CalendarRange,
  Users,
  BookOpen,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "subscription", label: "Abonnement", description: "Formule et paiement", icon: CreditCard },
  { id: "general", label: "Informations générales", description: "Données de l'établissement", icon: Building2 },
  { id: "year", label: "Année scolaire", description: "Périodes et trimestres", icon: CalendarRange },
  { id: "users", label: "Utilisateurs", description: "Comptes et rôles", icon: Users },
  { id: "subjects", label: "Matières", description: "Gestion des matières", icon: BookOpen },
  { id: "levels", label: "Niveaux scolaires", description: "Cycles et niveaux", icon: Layers },
];

export { SECTIONS };

export function SettingsNav({ active }) {
  return (
    <nav className="w-full shrink-0 space-y-1 lg:w-72">
      {SECTIONS.map(({ id, label, description, icon: Icon }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={`/settings?section=${id}`}
            className={cn(
              "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
