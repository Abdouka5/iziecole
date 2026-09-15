import Link from "next/link";
import {
  UserRound,
  FileText,
  Receipt,
  CalendarClock,
  Briefcase,
  UsersRound,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { formatFcfa } from "@/lib/subscription-plans";
import { getPlatformSettings } from "@/lib/platform-settings";
import { getCurrentMembership } from "@/lib/school-context";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: UserRound,
    color: "#1d4ed8",
    title: "Élèves",
    text: "Inscriptions, dossiers, classes et niveaux, historique scolaire conservé d'une année sur l'autre.",
  },
  {
    icon: FileText,
    color: "#7c3aed",
    title: "Notes & bulletins",
    text: "Saisie par les enseignants, calcul automatique des moyennes, bulletins et classement prêts à imprimer.",
  },
  {
    icon: Receipt,
    color: "#16a34a",
    title: "Finances",
    text: "Frais de scolarité encaissés sur place, reçu immédiat, suivi des dépenses et du solde de l'école.",
  },
  {
    icon: CalendarClock,
    color: "#f97316",
    title: "Emploi du temps",
    text: "Planning par classe et par enseignant, gestion des salles et détection des conflits d'horaires.",
  },
  {
    icon: Briefcase,
    color: "#0ea5e9",
    title: "Personnel",
    text: "Enseignants et administratifs, matières assignées, coordonnées et contrats au même endroit.",
  },
  {
    icon: UsersRound,
    color: "#db2777",
    title: "Utilisateurs & rôles",
    text: "Un compte par membre de l'équipe, avec les droits d'accès qui correspondent à sa fonction.",
  },
];

const FAQ = [
  {
    q: "Faut-il installer un logiciel ?",
    a: "Non. iziecole fonctionne dans le navigateur, sur ordinateur comme sur téléphone. Vos données sont sauvegardées en ligne.",
  },
  {
    q: "Le prix dépend-il du nombre d'élèves ?",
    a: "Non. Le prix couvre l'école entière pendant toute la durée de l'abonnement, quel que soit le nombre d'élèves ou de classes.",
  },
  {
    q: "Peut-on récupérer nos données existantes ?",
    a: "Oui. Envoyez votre liste d'élèves (Excel ou papier scanné) et nous l'importons pour vous au démarrage.",
  },
  {
    q: "Comment payer l'abonnement ?",
    a: "En ligne par Wave ou Orange Money, directement depuis votre espace. Le renouvellement est immédiat.",
  },
];

const linkClass = "text-[15px] font-medium text-[#475069] transition-colors hover:text-[#0d1526]";

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ subscriptionPrice, subscriptionDurationDays }, membership] = await Promise.all([
    getPlatformSettings(supabase),
    getCurrentMembership(),
  ]);

  const dashboardHref = membership?.role === "super_admin" ? "/admin" : "/dashboard";

  return (
    <div className="w-full overflow-x-hidden bg-white text-[#0d1526]">
      <header className="sticky top-0 z-50 border-b border-[#eef1f6] bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3.5 sm:px-6 lg:px-8">
          <img src="/brand/logologinpage.png" alt="iziecole" className="h-8 w-auto" />
          <nav className="ml-auto flex flex-wrap items-center justify-end gap-3 sm:gap-6">
            <a href="#fonctionnalites" className={linkClass}>
              Fonctionnalités
            </a>
            <a href="#apercu" className={linkClass}>
              Aperçu
            </a>
            <a href="#tarif" className={linkClass}>
              Tarif
            </a>
            {membership ? (
              <Link
                href={dashboardHref}
                className="flex items-center gap-2.5 rounded-full border border-[#e5eaf2] bg-[#f4f7ff] py-1.5 pl-1.5 pr-4 text-[14px] font-semibold text-[#0d1526] transition-colors hover:border-[#1d4ed8]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-[12px] font-bold text-white">
                  {getInitials(membership.fullName)}
                </span>
                {membership.fullName || "Mon compte"}
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[15px] font-semibold text-[#0d1526] transition-colors hover:text-[#1d4ed8]">
                  Se connecter
                </Link>
                <Link
                  href="/signup"
                  className="rounded-[10px] bg-[#1d4ed8] px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_6px_18px_rgba(29,78,216,0.28)] transition-colors hover:bg-[#1741b6]"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              "radial-gradient(120% 90% at 50% -10%, #12275c 0%, #0a1020 55%, #080d1a 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -left-[18%] top-[10%] h-[80%] w-[60%] blur-[10px]"
            style={{ background: "radial-gradient(circle at 30% 50%, rgba(29,78,216,0.45), rgba(29,78,216,0) 62%)" }}
          />
          <div
            className="pointer-events-none absolute -right-[16%] top-[24%] h-[70%] w-[52%] blur-[10px]"
            style={{ background: "radial-gradient(circle at 70% 50%, rgba(249,115,22,0.28), rgba(249,115,22,0) 62%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(70% 55% at 50% 20%, #000 0%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(70% 55% at 50% 20%, #000 0%, transparent 75%)",
            }}
          />

          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-14 text-center sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.16] bg-white/[0.08] px-4 py-2 text-[13.5px] font-semibold text-[#dbe3f5]">
              <span className="h-2 w-2 rounded-full bg-[#f97316]" />
              Conçu pour les écoles privées d&rsquo;Afrique de l&rsquo;Ouest
            </div>
            <h1 className="mt-6 max-w-3xl text-[2.4rem] font-extrabold leading-[1.02] tracking-tight text-balance text-white sm:text-6xl lg:text-7xl">
              Toute votre école,
              <br />
              dans <span className="text-[#6f9bff]">un seul outil</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#a8b3cc] sm:text-lg">
              Élèves, notes, bulletins, paiements et emploi du temps — de la Maternelle au
              Lycée, réunis dans une plateforme claire et accessible partout.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={membership ? dashboardHref : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-6 py-4 text-base font-bold text-white shadow-[0_14px_34px_rgba(29,78,216,0.45)] transition-colors hover:bg-[#2f63f0]"
              >
                {membership ? "Aller à mon tableau de bord" : "Créer votre compte école"}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#apercu"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 text-base font-bold text-[#0d1526] transition-colors hover:bg-[#e9eefb]"
              >
                Voir l&rsquo;application
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-11 w-full max-w-4xl rounded-t-[20px] border border-b-0 border-white/[0.14] bg-white/[0.07] p-2.5 pb-0 shadow-[0_-10px_80px_rgba(29,78,216,0.35)] sm:mt-16">
              <img
                src="/landing/dashboard.png"
                alt="Tableau de bord iziecole"
                className="block w-full rounded-t-xl"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="fonctionnalites" className="bg-[#fbfcff]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-xl">
              <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#f97316]">
                Fonctionnalités
              </div>
              <h2 className="mt-3.5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-[#0d1526] sm:text-4xl lg:text-[44px]">
                Un outil par tâche, réunis en une seule plateforme
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-[#4a5570]">
                Chaque module parle aux autres : un paiement enregistré met à jour la fiche
                élève, un bulletin se génère à partir des notes saisies par les enseignants.
              </p>
            </div>
            <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, color, title, text }) => (
                <div key={title} className="rounded-2xl border border-[#e8ecf5] bg-white p-6">
                  <div
                    className="flex h-[46px] w-[46px] items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  </div>
                  <h3 className="mt-5 text-[19px] font-bold tracking-tight text-[#0d1526]">{title}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[#5a6480]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview */}
        <section id="apercu" className="bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-14 sm:gap-24 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
              <div className="min-w-0">
                <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#1d4ed8]">
                  Élèves
                </div>
                <h2 className="mt-3.5 text-balance text-[26px] font-extrabold leading-[1.12] tracking-tight text-[#0d1526] sm:text-[32px] lg:text-[38px]">
                  Le dossier de chaque élève, à jour et retrouvable en deux secondes
                </h2>
                <p className="mt-4 text-[17px] leading-[1.65] text-[#4a5570]">
                  Inscriptions, matricules, classes et niveaux, statut de scolarité. Filtrez
                  par classe, par cycle ou par statut, exportez la liste quand l&rsquo;inspection
                  la demande.
                </p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {[
                    "Matricule généré automatiquement",
                    "Recherche instantanée nom, prénom, matricule",
                    "Historique scolaire conservé d'une année à l'autre",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-[15.5px] font-medium text-[#39435c]">
                      <Check className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={3} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <img
                  src="/landing/students.png"
                  alt="Liste des élèves dans iziecole"
                  className="w-full rounded-2xl border border-[#e2e7f2] shadow-[0_26px_60px_-30px_rgba(13,21,38,0.45)]"
                />
              </div>
            </div>

            <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-12">
              <div className="min-w-0 sm:order-2">
                <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#f97316]">
                  Finances
                </div>
                <h2 className="mt-3.5 text-balance text-[26px] font-extrabold leading-[1.12] tracking-tight text-[#0d1526] sm:text-[32px] lg:text-[38px]">
                  Savoir exactement qui a payé, et ce qu&rsquo;il reste à encaisser
                </h2>
                <p className="mt-4 text-[17px] leading-[1.65] text-[#4a5570]">
                  Encaissez les frais de scolarité en espèces, par Wave ou Orange Money,
                  imprimez le reçu sur place et suivez les élèves en retard sans ouvrir un
                  seul classeur.
                </p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {[
                    "Reçu imprimable à chaque paiement",
                    "Encaissements, dépenses et solde en direct",
                    "Rapports exportables par classe ou par période",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-[15.5px] font-medium text-[#39435c]">
                      <Check className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={3} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0 sm:order-1">
                <img
                  src="/landing/finance.png"
                  alt="Module Finances d'iziecole"
                  className="w-full rounded-2xl border border-[#e2e7f2] shadow-[0_26px_60px_-30px_rgba(13,21,38,0.45)]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile */}
        <section className="overflow-hidden bg-[#0b1220] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:gap-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <div className="min-w-0">
              <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#f97316]">
                Mobile
              </div>
              <h2 className="mt-3.5 text-balance text-[28px] font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-[42px]">
                Votre école dans votre poche, même depuis la cour de récréation
              </h2>
              <p className="mt-5 max-w-lg text-[17px] leading-[1.65] text-[#a7b0c6]">
                iziecole fonctionne dans le navigateur de votre téléphone : rien à installer,
                rien à mettre à jour. Le directeur consulte les encaissements du jour,
                l&rsquo;enseignant saisit ses notes, le surveillant fait l&rsquo;appel.
              </p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="text-[15px] font-bold">Hors bureau</div>
                  <div className="mt-1.5 text-sm leading-relaxed text-[#9aa4bd]">
                    Accessible depuis n&rsquo;importe quel téléphone connecté.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <div className="text-[15px] font-bold">Comptes par rôle</div>
                  <div className="mt-1.5 text-sm leading-relaxed text-[#9aa4bd]">
                    Direction, comptabilité, enseignants : chacun son accès.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex min-w-0 justify-center">
              <img
                src="/landing/mobile.webp"
                alt="iziecole sur téléphone"
                className="w-[min(80%,320px)] drop-shadow-[0_40px_60px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="tarif" className="border-t border-[#eef1f6] bg-[#fbfcff]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#f97316]">
                Tarif
              </div>
              <h2 className="mt-3.5 text-3xl font-extrabold leading-[1.1] tracking-tight text-[#0d1526] sm:text-4xl lg:text-[44px]">
                Un seul prix, tout inclus
              </h2>
              <p className="mt-3.5 text-[17px] leading-relaxed text-[#4a5570]">
                Toutes les fonctionnalités, tous les cycles, un nombre illimité d&rsquo;élèves.
                Pas de frais d&rsquo;installation, pas de module en supplément.
              </p>
            </div>
            <div className="mx-auto mt-11 grid max-w-3xl items-start gap-6 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[#e8ecf5] bg-white p-7 sm:p-9">
                <div className="text-[15px] font-bold text-[#66708a]">Abonnement école</div>
                <div className="mt-3.5 flex flex-wrap items-baseline gap-2">
                  <span className="text-[34px] font-extrabold tracking-tight text-[#0d1526] sm:text-[42px] lg:text-[50px]">
                    {formatFcfa(subscriptionPrice)}
                  </span>
                  <span className="text-[15px] font-semibold text-[#66708a]">
                    / {subscriptionDurationDays} jours
                  </span>
                </div>
                <div className="mt-2 text-sm text-[#66708a]">Renouvelable en ligne, sans engagement.</div>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Élèves illimités, tous les niveaux",
                    "Tous les modules inclus, sans supplément",
                    "Comptes illimités pour votre équipe",
                    "Renouvellement en ligne (Wave, Orange Money)",
                    "Support par WhatsApp et e-mail",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-[15.5px] font-medium leading-relaxed text-[#39435c]">
                      <Check className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={3} />
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href={membership ? dashboardHref : "/signup"}
                  className="mt-7 block rounded-xl bg-[#1d4ed8] px-6 py-3.5 text-center text-base font-bold text-white shadow-[0_12px_26px_rgba(29,78,216,0.28)] transition-colors hover:bg-[#1741b6]"
                >
                  {membership ? "Aller à mon tableau de bord" : "Créer votre compte école"}
                </Link>
              </div>
              <div
                className="rounded-[20px] p-7 text-white sm:p-9"
                style={{ background: "linear-gradient(160deg, #122a63, #0b1220)" }}
              >
                <div className="text-[15px] font-bold text-[#f9a86b]">Mise en route accompagnée</div>
                <p className="mt-3.5 text-base leading-[1.65] text-[#c2cadd]">
                  Envoyez-nous votre liste d&rsquo;élèves et votre grille de classes : nous
                  importons vos données et configurons votre première année scolaire avec vous.
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Import de vos élèves existants",
                    "Paramétrage des classes et des frais",
                    "Formation de votre équipe (1 h)",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-[15.5px] text-[#e3e8f3]">
                      <span className="font-extrabold text-[#f97316]">→</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className="mt-7 inline-block rounded-xl border border-white/[0.22] bg-white/10 px-6 py-3 text-[15px] font-bold text-white transition-colors hover:border-[#f97316] hover:bg-[#f97316]"
                >
                  Parler à l&rsquo;équipe
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-24 lg:px-8">
            <h2 className="text-center text-[26px] font-extrabold tracking-tight text-[#0d1526] sm:text-3xl lg:text-4xl">
              Questions fréquentes
            </h2>
            <div className="mt-9 flex flex-col gap-3.5">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-[#e8ecf5] bg-[#fbfcff] p-6 sm:p-6">
                  <div className="text-[17px] font-bold text-[#0d1526]">{q}</div>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-[#5a6480]">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="inscription" className="border-t border-[#e7ecf7] bg-[#f4f7ff]">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-24 lg:px-8">
            <h2 className="text-balance text-[30px] font-extrabold leading-[1.08] tracking-tight text-[#0d1526] sm:text-4xl lg:text-5xl">
              Commencez la rentrée avec une école organisée
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[17.5px] leading-relaxed text-[#4a5570]">
              Créez votre compte école en quelques minutes et inscrivez vos premiers élèves
              aujourd&rsquo;hui.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {membership ? (
                <Link
                  href={dashboardHref}
                  className="rounded-xl bg-[#1d4ed8] px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(29,78,216,0.3)] transition-colors hover:bg-[#1741b6]"
                >
                  Aller à mon tableau de bord
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="rounded-xl bg-[#1d4ed8] px-7 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(29,78,216,0.3)] transition-colors hover:bg-[#1741b6]"
                  >
                    Créer votre compte école
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-[#dfe4ef] bg-white px-7 py-4 text-base font-bold text-[#0d1526] transition-colors hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                  >
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#0b1220] text-[#8e98b0]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-16 lg:grid-cols-4 lg:px-8">
          <div>
            <img src="/brand/wordmark-white.png" alt="iziecole" className="h-8 w-auto" />
            <p className="mt-4 max-w-[280px] text-sm leading-relaxed">
              Le logiciel de gestion des écoles privées, de la Maternelle au Lycée.
            </p>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Produit</div>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <a href="#fonctionnalites" className="transition-colors hover:text-[#f97316]">
                Fonctionnalités
              </a>
              <a href="#apercu" className="transition-colors hover:text-[#f97316]">
                Aperçu de l&rsquo;app
              </a>
              <a href="#tarif" className="transition-colors hover:text-[#f97316]">
                Tarif
              </a>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Compte</div>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              {membership ? (
                <Link href={dashboardHref} className="transition-colors hover:text-[#f97316]">
                  Tableau de bord
                </Link>
              ) : (
                <>
                  <Link href="/login" className="transition-colors hover:text-[#f97316]">
                    Se connecter
                  </Link>
                  <Link href="/signup" className="transition-colors hover:text-[#f97316]">
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Contact</div>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <a href="mailto:contact@iziecole.com" className="transition-colors hover:text-[#f97316]">
                contact@iziecole.com
              </a>
              <span>Dakar, Sénégal</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.08]">
          <div className="mx-auto max-w-6xl px-4 py-5 text-[13.5px] sm:px-6 lg:px-8">
            © {new Date().getFullYear()} iziecole — Tous droits réservés
          </div>
        </div>
      </footer>
    </div>
  );
}
