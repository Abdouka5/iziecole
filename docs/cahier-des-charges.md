# Cahier des charges — iziecole

## 1. Présentation du projet

- **Nom du produit** : iziecole (iziecole.com)
- **Type** : SaaS de gestion scolaire multi-établissements (multi-tenant)
- **Cible** : Écoles privées du Sénégal, de la Maternelle au Lycée
- **Slogan** : La gestion scolaire, simplifiée

## 2. Identité visuelle

- **Logo** : wordmark "izi" (bleu `#185FA5`) + "ecole" (gris foncé `#2C2C2A`), points des
  "i" en cercles orange safran `#EF9F27`
- **Couleurs** : Bleu institutionnel `#185FA5` (principal), Safran `#EF9F27`
  (accent/actions), Blanc, Gris texte `#2C2C2A`
- **Typographie** : Inter / Poppins — priorité lisibilité (tableaux, bulletins)
- **Ton** : sobre, institutionnel, pas enfantin (l'outil est utilisé par des adultes :
  direction, enseignants, parents)

Fichiers de marque (logo carré, wordmark) : voir `docs/decisions.md` — assets à déposer
dans `public/brand/`.

## 3. Architecture technique

- **Stack** : Next.js 14 (App Router), Supabase (PostgreSQL + Auth + RLS),
  Tailwind CSS + shadcn/ui
- **Modèle multi-tenant** : une seule base de données, isolation par `school_id` avec
  Row Level Security (RLS) sur chaque table
- **Accès école** : sélection d'établissement après connexion (voir `docs/decisions.md`)
- **Déploiement** : Netlify ou Vercel
- **Langue** : JavaScript (pas de TypeScript)

## 4. Rôles utilisateurs

| Rôle | Accès |
|---|---|
| Super Admin | Gestion globale de toutes les écoles |
| Admin école / Direction | Gestion complète de son établissement |
| Enseignant | Saisie des notes, emploi du temps, communication vers ses classes |
| Caissier | Recherche élève, saisie de paiement, impression reçu thermique, caisse du jour — pas d'accès aux notes ni aux paramètres |
| Parent | Suivi de son/ses enfant(s) : notes, absences, paiements, annonces |
| Élève (optionnel) | Consultation notes/emploi du temps |

## 5. Modules fonctionnels

### 5.1 Gestion élèves
- Inscription / réinscription
- Dossier élève (état civil, classe, niveau, photo, documents)
- Historique scolaire (années précédentes, transferts)
- Gestion des classes et niveaux (Maternelle → Terminale)

### 5.2 Notes & bulletins
- Saisie des notes par matière et par enseignant
- Coefficients par matière/filière
- Calcul automatique des moyennes (par matière, générale, par trimestre/semestre)
- Génération de bulletins en PDF
- Classement de classe

### 5.3 Finances
- Définition des frais de scolarité par niveau
- Échéancier de paiement (mensuel, trimestriel, annuel — à définir par école)
- Encaissement sur place par le Caissier : recherche élève → saisie du paiement du
  mois → confirmation
- Impression de reçu thermique (58mm/80mm) à chaque paiement encaissé
- Paiement en ligne : Wave, Orange Money
- Suivi des impayés et relances
- Historique des versements par élève
- État financier global par école

### 5.4 Emploi du temps
- Planning par classe et par enseignant
- Gestion des salles
- Détection des conflits d'horaires

### 5.5 Communication
- Annonces générales (école → tous les parents)
- Notifications ciblées (SMS / WhatsApp / email)
- Messagerie direction ↔ parents

## 6. Formules d'abonnement

| Formule | Prix | Couverture |
|---|---|---|
| Préscolaire (La Maternelle) | 5 000 FCFA/mois | Niveau maternelle, élèves illimités |
| Élémentaire (Le Primaire) | 15 000 FCFA/mois | Niveau primaire, élèves illimités |
| Le Collège au Lycée | 25 000 FCFA/mois | Secondaire, élèves illimités |
| École complète | 35 000 FCFA/mois | Tous niveaux réunis |

Tous les modules sont inclus dans chaque formule — la formule détermine le(s) niveau(x)
scolaire(s) couvert(s), pas les fonctionnalités.

## 7. Point technique à cadrer

Impression thermique : l'impression ESC/POS directe depuis un navigateur web est
limitée. Solutions à évaluer : pont local type QZ Tray, ou application companion
(web/Android) connectée en Bluetooth à l'imprimante 58mm/80mm du caissier.

## 8. Paiement gateways intégrés

Wave, Orange Money (CinetPay ou PayTech comme agrégateur possible).
