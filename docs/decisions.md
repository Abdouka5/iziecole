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

## Passerelle de paiement en ligne : PayTech

**Statut** : décidé.

Le cahier des charges laissait le choix entre CinetPay et PayTech comme agrégateur pour
Wave et Orange Money. **PayTech retenu** — compte marchand ouvert, clés API en place
dans `.env.local` (`PAYTECH_API_KEY`, `PAYTECH_API_SECRET`, `PAYTECH_ENV`).

Reste à faire avant d'activer le paiement en ligne dans le module Finance :
- Écrire le client PayTech (`src/lib/paytech.js`) : création de demande de paiement,
  redirection Wave/Orange Money, vérification de signature sur le webhook IPN.
- Ajouter une route webhook (`/api/paytech/ipn` ou équivalent) qui marque
  `invoices`/`payments` payés à réception de la confirmation PayTech, en réutilisant le
  trigger `recompute_invoice_status` déjà en place (`supabase/migrations/0005_finance.sql`).
- Confirmer si `PAYTECH_ENV` doit être `test` ou `prod` selon le type de clés fournies
  par PayTech.

## Assets de marque

**Statut** : en attente des fichiers sources.

Le logo (icône carrée bleue et wordmark "izi ecole") a été fourni en aperçu visuel
mais pas encore comme fichiers images dans le dépôt. À déposer dans `public/brand/`
(voir `public/brand/README.md`) : logo carré (icône d'app / favicon), wordmark
horizontal (SVG de préférence), et si possible une version monochrome blanche pour
fonds sombres/bleus.
