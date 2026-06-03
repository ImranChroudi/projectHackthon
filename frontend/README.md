# Plateforme de Gestion de Présence — Frontend

Interface React (SPA) pour la plateforme de présence du centre de formation. Entièrement en
**français**, design minimaliste et professionnel aux couleurs **bleu / vert / gris**.

## Stack
- **React 18 + Vite** (JavaScript / JSX)
- **Tailwind CSS** + primitives style shadcn/ui (Radix UI)
- **TanStack Query** (React Query) + **axios** pour les données serveur
- **react-router-dom** (routage par rôle)
- **react-hook-form** + **zod** (formulaires)
- **html5-qrcode** (scan caméra), **recharts** (graphiques), **sonner** (toasts), **lucide-react** (icônes)

## Démarrage

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

> Le backend doit tourner sur le port **5000** (`cd ../backend && npm run dev`).
> Vite proxifie `/api` et `/uploads` vers `http://localhost:5000` — aucune config CORS nécessaire.

Connectez-vous avec les comptes de démonstration du backend (`npm run seed`) :
- **Admin** : `admin@centre.ma` / `Admin123!`
- **Formateur** : `formateur@centre.ma` / `Formateur123!`
- **Stagiaire** : `stagiaire1@centre.ma` / `Stagiaire123!`

## Architecture

```
src/
  lib/            api.js (axios + JWT + 401/423), queryClient, utils (cn), format (dates fr), constants
  components/ui/  primitives (button, card, input, badge, table, dialog, select, tabs, …)
  components/     AppShell, NotificationBell, StatusBadge, StatCard, EmptyState, PageHeader
  context/        AuthContext (JWT localStorage, login/logout anti-fraude)
  routes/         ProtectedRoute (garde de rôle), AppRouter
  hooks/          queries.js (référentiel, sessions, notifications, annonces)
  features/
    auth/         LoginPage
    stagiaire/    Dashboard, ScanPage (caméra), MesPrésences, Justifications, Notifications
    formateur/    Dashboard (analyses scopées), Sessions, SessionDetail (QR live + feuille)
    admin/        Dashboard, Utilisateurs, Référentiel, EmploiDuTemps, Justifications, Annonces, Analyses
    shared/       AnnoncesPage (lecture seule)
```

## Espaces par rôle

| Rôle | Fonctionnalités |
|---|---|
| **Stagiaire** | Compteur d'absences vs seuil · scan QR par caméra · historique de présence · soumission de justifications (texte + fichiers) · notifications · annonces |
| **Formateur** | Tableau de bord **limité à ses groupes/modules** · activation de session · **QR dynamique auto-rafraîchi** avec compte à rebours · feuille de présence en temps réel |
| **Admin** | KPIs · gestion des utilisateurs · référentiel (groupes/salles/modules) · composition de l'emploi du temps + génération des sessions · file de validation des justifications · annonces ciblées · analyses (modules, créneaux, groupes, top stagiaires) |

## Points clés d'implémentation

- **Anti-fraude déconnexion** : `AuthContext.logout()` gère le code **423** (verrou de présence)
  et affiche le message français sans déconnecter.
- **QR dynamique** : la page session du formateur rafraîchit le QR via `refetchInterval` à la
  cadence `rotationSeconds` renvoyée par l'API, avec compte à rebours jusqu'à `expiresAt`.
- **Scan caméra** : `html5-qrcode` lit la charge utile `{ s, t }` et appelle `POST /sessions/:id/scan`.
  Nécessite **localhost ou HTTPS** (contrainte navigateur `getUserMedia`).
- **Gestion 401** : intercepteur axios → déconnexion + redirection vers `/login`.

## Build

```bash
npm run build        # génère dist/ (build de production vérifié)
npm run preview      # prévisualise le build
```
