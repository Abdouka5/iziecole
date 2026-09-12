# Base de données iziecole

Migrations SQL pour le projet Supabase, à appliquer dans l'ordre (`0001_...` → `0007_...`).

## Appliquer les migrations

Avec la [CLI Supabase](https://supabase.com/docs/guides/cli) :

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Ou en collant chaque fichier, dans l'ordre, dans le SQL Editor du dashboard Supabase.

## Modèle multi-tenant

Une seule base de données. Chaque table métier porte une colonne `school_id`, et la RLS
(Row Level Security) est activée sur toutes ces tables. L'accès est déterminé via les
fonctions helper définies dans `0001_core.sql` :

- `is_super_admin()` — vrai pour le compte super admin (toi), qui voit toutes les écoles.
- `is_member_of_school(school_id)` — vrai si l'utilisateur courant a un rôle (`memberships`)
  dans cette école.
- `has_role_in_school(school_id, role)` — vrai si l'utilisateur a précisément ce rôle
  dans cette école.

Un utilisateur (`profiles`) peut avoir plusieurs `memberships` (ex: enseignant dans une
école, parent dans une autre). L'accès d'un parent à un élève précis passe par la table
`guardians`, pas seulement par le `membership` de rôle `parent`.

## Fichiers

| Fichier | Contenu |
|---|---|
| `0001_core.sql` | `schools`, `profiles`, `memberships`, fonctions RLS |
| `0002_academic_structure.sql` | `school_years`, `levels`, `classes`, `subjects`, `class_subjects` |
| `0003_students.sql` | `students`, `enrollments`, `guardians` |
| `0004_grades.sql` | `terms`, `grades` |
| `0005_finance.sql` | `fee_schedules`, `invoices`, `payments` (+ trigger de statut auto) |
| `0006_schedule.sql` | `rooms`, `timetable_slots` |
| `0007_communication.sql` | `announcements`, `messages` |
| `0008_payments_receipt_unique.sql` | Contrainte d'unicité sur les numéros de reçu |
| `0009_subscription_billing.sql` | `subscription_payments` (abonnement école → iziecole) |
| `0010_documents.sql` | `documents` + bucket Storage privé `documents` |

Pour une base neuve, le plus simple est de coller `supabase/bootstrap.sql` (toutes les
migrations concaténées dans l'ordre) en une seule fois dans le SQL Editor.
