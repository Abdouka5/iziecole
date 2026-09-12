# Journal des décisions d'architecture

## Accès multi-établissement : sélection après connexion (pas de sous-domaine)

**Statut** : décidé pour le MVP, à revisiter.

Le cahier des charges laissait le choix ouvert entre un sous-domaine par école
(`ecole-x.iziecole.com`) et une sélection d'établissement après connexion. Choix retenu
pour le scaffold initial : **sélection après connexion**.

Raisons :
- Pas de configuration DNS wildcard ni de certificats par sous-domaine à gérer au
  lancement (Vercel/Netlify supportent les deux, mais ça ajoute une étape d'ops par
  école onboardée).
- Un utilisateur avec plusieurs `memberships` (ex: parent dans deux écoles) reste
  simple à gérer avec un sélecteur, alors qu'un sous-domaine forcerait à rediriger
  entre domaines.
- L'isolation reste identique (RLS par `school_id`), donc migrer vers des sous-domaines
  plus tard ne casse pas le modèle de données — ça ajoute juste un routage/middleware
  supplémentaire pour résoudre `school_id` depuis le sous-domaine au lieu d'un
  sélecteur en session.

À revisiter si : le nombre d'écoles grandit au point où la sélection devient
pénible pour un directeur qui ne gère qu'un seul établissement (cas majoritaire), ou
si le branding par école (logo, couleurs) sur un domaine dédié devient une demande
client fréquente.

## Impression thermique : non résolu

**Statut** : ouvert, non implémenté dans le scaffold initial.

Le cahier des charges pointe la limite de l'impression ESC/POS directe depuis un
navigateur. Deux pistes à évaluer avant d'implémenter le module Caisse :

1. **QZ Tray** (pont local signé) — le navigateur envoie les données à un petit
   service tournant sur le poste du caissier, qui pilote l'imprimante thermique
   (USB/réseau/Bluetooth). Robuste, mais demande une installation sur chaque poste
   caissier.
2. **Application companion** (PWA ou app Android légère) connectée en Bluetooth à
   l'imprimante 58mm/80mm, qui reçoit les données de reçu depuis le web (ex: via un
   endpoint local ou une notification push) et gère l'impression ESC/POS nativement.

Le module Finance (`supabase/migrations/0005_finance.sql`) enregistre les paiements et
génère les données de reçu ; le mécanisme d'impression physique reste à choisir avant
de construire l'écran caissier.

## Passerelle de paiement en ligne : retiré du périmètre

**Statut** : décidé — pas de paiement en ligne.

Le cahier des charges envisageait un paiement en ligne via Wave/Orange Money par un
agrégateur (CinetPay ou PayTech). PayTech avait été retenu et un premier client avait
été implémenté (`src/lib/paytech.js`, webhook IPN `/api/paytech/ipn`,
`src/lib/supabase/admin.js` pour le client service-role) — **le tout a été retiré**
(2026-09-12) : les écoles ne paient/n'encaissent pas en ligne.

Le module Finance reste centré sur l'encaissement **sur place par le Caissier** :
recherche élève → saisie du paiement → reçu imprimé (voir "Impression thermique"
ci-dessus, toujours ouvert). `wave` et `orange_money` restent des valeurs possibles
de `payments.method` (`supabase/migrations/0005_finance.sql`) — elles servent juste à
taguer qu'un versement reçu en personne (espèces, ou transfert Wave/OM montré sur le
téléphone du parent) l'a été par ce moyen, ça ne rouvre pas d'intégration API.

Si le paiement en ligne redevient pertinent plus tard, le code retiré donne un point
de départ (commit avant le 2026-09-12) plutôt que de repartir de zéro.

**À ne pas confondre avec le module Abonnements ci-dessous** — ce qui est retiré ici,
c'est le paiement des frais de scolarité (parent → école) en ligne. Le paiement de
l'abonnement iziecole lui-même (école → iziecole) est un besoin distinct, toujours
prévu.

## Module Abonnements (école → iziecole) : implémenté (paiement en ligne dédié)

**Statut** : décidé et implémenté (2026-09-12) — paiement en ligne via PayTech,
réutilisé mais dans un flux séparé de celui retiré ci-dessus.

C'est l'école cliente qui paie son abonnement iziecole (une des 4 formules — voir
`docs/cahier-des-charges.md` §6), pas un parent qui paie des frais de scolarité.

- `supabase/migrations/0009_subscription_billing.sql` — table
  `subscription_payments` (école, formule, montant, période, statut
  pending/paid/failed/cancelled, référence PayTech). Visible seulement par
  `school_admin` (sa propre école) et `super_admin` (toutes).
- `src/lib/subscription-plans.js` — prix par formule (5 000 / 15 000 / 25 000 /
  35 000 FCFA), source unique pour l'admin et les paramètres école.
- `src/lib/paytech.js` — client PayTech dédié à ce flux (`buildRefCommand` préfixe
  `SUB-`, distinct du `INV-` de l'ancien flux tuition supprimé) +
  `src/lib/supabase/admin.js` (client service-role pour le webhook, aucune session
  utilisateur côté PayTech).
- `src/app/api/paytech/subscription-ipn/route.js` — webhook : marque le paiement
  `paid` et met à jour `schools.subscription_plan` (gère aussi bien un
  renouvellement qu'un changement de formule).
- `src/app/(app)/settings/actions.js` + `page.js` — la direction (`school_admin`)
  déclenche le paiement du mois depuis Paramètres, voit l'historique.
- `src/app/(app)/admin/page.js` — le Super Admin voit le statut d'abonnement
  (à jour / en attente / aucun paiement) de chaque école.

Pas encore fait : facturation récurrente automatique (aujourd'hui c'est la direction
qui clique "Payer" chaque mois, rien n'envoie de rappel), et pas de blocage d'accès
automatique en cas d'impayé — le Super Admin voit juste le statut dans `/admin`.

### Inscription self-service (`/signup`)

Une école peut désormais créer son propre compte sans passer par le Super Admin —
`src/app/signup/page.js` + `actions.js`. Le formulaire (nom d'établissement, niveau =
la formule payante, e-mail admin, téléphone +221, mot de passe) crée en une seule
action : l'utilisateur Supabase Auth (`school_admin`), la ligne `schools` (slug généré
et dédupliqué automatiquement), et le `membership` `school_admin` qui les relie.

Ces deux derniers inserts utilisent `createAdminClient()` (service-role) exprès : un
tout nouveau compte n'a encore aucun membership, donc les policies RLS normales
(`school_admin` gère les memberships *de son école*) ne peuvent pas s'appliquer à sa
toute première ligne — c'est le même genre d'échappatoire contrôlée que le webhook
PayTech. Après inscription, l'école atterrit sur `/select-school` (ou est invitée à
confirmer son e-mail si la confirmation est activée côté Supabase Auth), puis peut
payer son abonnement depuis `/settings` comme n'importe quelle école.

## Assets de marque

**Statut** : en attente des fichiers sources.

Le logo (icône carrée bleue et wordmark "izi ecole") a été fourni en aperçu visuel
mais pas encore comme fichiers images dans le dépôt. À déposer dans `public/brand/`
(voir `public/brand/README.md`) : logo carré (icône d'app / favicon), wordmark
horizontal (SVG de préférence), et si possible une version monochrome blanche pour
fonds sombres/bleus.
