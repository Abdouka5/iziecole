# iziecole

SaaS de gestion scolaire multi-établissements pour les écoles privées du Sénégal
(Maternelle → Lycée). Cahier des charges complet : [docs/cahier-des-charges.md](docs/cahier-des-charges.md).
Décisions d'architecture et points ouverts : [docs/decisions.md](docs/decisions.md).

## Stack

- Next.js 14 (App Router), JavaScript
- Supabase (PostgreSQL + Auth + Row Level Security)
- Tailwind CSS v4 + shadcn/ui

## Démarrer en local

1. Créer un projet Supabase, puis copier `.env.local.example` vers `.env.local` et
   renseigner `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
2. Appliquer les migrations SQL dans `supabase/migrations/` (voir `supabase/README.md`).
3. Installer et lancer :

```bash
npm install
npm run dev
```

Sans `.env.local`, la page d'accueil et `/login` se chargent, mais toute page qui
interroge Supabase (tableau de bord, sélection d'école, etc.) échouera — c'est attendu
tant qu'aucun projet Supabase n'est connecté.

## Structure

```
src/
  app/
    login/                 Connexion (email + mot de passe)
    select-school/         Sélection d'établissement (multi-tenant)
    auth/callback/         Échange du code Supabase (confirmation email, magic link)
    (app)/                 Zone authentifiée : sidebar + header, protégée par school-context
      dashboard/ students/ grades/ finance/ schedule/ communication/ settings/
      caisse/              Écran caissier (accès restreint)
      admin/               Liste des écoles (super admin uniquement)
  components/
    ui/                    shadcn/ui
    layout/                Sidebar, Header, ModulePlaceholder
    brand/                 Logo (wordmark iziecole)
  lib/
    supabase/              Clients browser/server + middleware de session
    school-context.js      Résout { role, school } depuis le cookie de session
    roles.js                Constantes de rôles
supabase/
  migrations/              Schéma SQL + RLS (voir supabase/README.md)
docs/
  cahier-des-charges.md
  decisions.md
```

## Modèle multi-tenant

Une seule base de données Supabase, isolation par `school_id` avec Row Level Security
sur chaque table (voir `supabase/README.md`). Après connexion, l'utilisateur choisit son
établissement sur `/select-school` ; ce choix est stocké dans un cookie et résolu à
chaque requête par `getCurrentMembership()` (`src/lib/school-context.js`), qui détermine
son rôle (`school_admin`, `teacher`, `cashier`, `parent`, `student`) et donc la
navigation et les données accessibles.

## Où en est le scaffold

Fait :
- Auth Supabase (connexion, callback), sélection d'établissement, layout authentifié
  avec navigation par rôle
- Schéma complet + RLS pour les 5 modules du cahier des charges (élèves, notes,
  finances, emploi du temps, communication)
- Charte graphique (couleurs, typographie) branchée dans Tailwind

Pas fait (placeholders en l'état) :
- Landing page marketing (page `/` encore celle par défaut de `create-next-app`)
- CRUD réel dans les pages `students/`, `grades/`, `finance/`, `schedule/`,
  `communication/`, `settings/` — actuellement des `ModulePlaceholder`
- Écran caissier fonctionnel (wireframe seulement) et impression thermique
  (mécanisme non tranché, voir `docs/decisions.md`)
- Génération de bulletins PDF, calcul des moyennes/classements
- Intégration Wave / Orange Money
