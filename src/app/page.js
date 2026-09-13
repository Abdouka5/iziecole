import Link from "next/link";
import {
  User,
  FileText,
  Receipt,
  CalendarClock,
  Check,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFcfa, SUBSCRIPTION_PRICE, SUBSCRIPTION_DURATION_DAYS } from "@/lib/subscription-plans";

const MODULES = [
  {
    icon: User,
    accent: "blue",
    title: "Élèves",
    description: "Inscriptions, dossiers élèves, classes et niveaux, historique scolaire.",
  },
  {
    icon: FileText,
    accent: "purple",
    title: "Notes & bulletins",
    description: "Saisie des notes par les enseignants, calcul automatique des moyennes, bulletins, classement.",
  },
  {
    icon: Receipt,
    accent: "green",
    title: "Paiements",
    description: "Encaissement des frais de scolarité sur place, avec reçu imprimé immédiat.",
  },
  {
    icon: CalendarClock,
    accent: "amber",
    title: "Emploi du temps",
    description: "Planning par classe et par enseignant, gestion des salles.",
  },
];

const ACCENT_STYLES = {
  blue: { bg: "#e8f1fa", fg: "#146ef5" },
  purple: { bg: "#f1ebfc", fg: "#7f56d9" },
  green: { bg: "#e7f6ec", fg: "#12b76a" },
  amber: { bg: "#fdf1e0", fg: "#f79009" },
};

export default function LandingPage() {
  return (
    <div className="bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo className="text-xl" />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Créer un compte</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            La gestion scolaire, simplifiée
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            iziecole est un logiciel tout-en-un pour gérer votre école privée, de la
            Maternelle au Lycée — élèves, notes, paiements et emploi du temps réunis
            dans un seul outil.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Créer votre compte école
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Un seul outil pour toute la gestion de votre établissement
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ icon: Icon, accent, title, description }) => {
              const { bg, fg } = ACCENT_STYLES[accent];
              return (
                <Card key={title}>
                  <CardContent className="p-6">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-t bg-secondary/40 py-20">
          <div className="mx-auto max-w-lg px-6 text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Un seul prix, tout inclus
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Toutes les fonctionnalités, de la Maternelle au Lycée, sans distinction de niveau.
            </p>
            <Card className="mt-8">
              <CardContent className="flex flex-col items-center p-8">
                <p className="text-4xl font-bold text-foreground">
                  {formatFcfa(SUBSCRIPTION_PRICE)}
                </p>
                <p className="text-sm text-muted-foreground">
                  pour {SUBSCRIPTION_DURATION_DAYS} jours, renouvelable
                </p>
                <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-status-good" />
                    Élèves illimités, tous niveaux
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-status-good" />
                    Tous les modules inclus
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-status-good" />
                    Renouvellement en ligne (Wave, Orange Money)
                  </li>
                </ul>
                <Button className="mt-6 w-full" asChild>
                  <Link href="/signup">Créer votre compte école</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <Logo className="text-base" />
          <p>© {new Date().getFullYear()} iziecole — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}
