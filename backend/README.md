# Plateforme de Gestion de Présence & Analyse — Backend

API Node.js / Express / MongoDB pour la gestion automatisée des présences d'un centre de
formation : QR codes dynamiques, règle des 15 minutes, justifications d'absence, alertes et
tableaux de bord analytiques. Toutes les réponses sont en **français**.

## Stack
- Node.js + Express (ES modules)
- MongoDB + Mongoose
- Auth : JWT (email + mot de passe), 3 rôles : `admin`, `formateur`, `stagiaire`
- Job planifié : `node-cron`
- QR : `qrcode` + jeton tournant signé (HMAC)
- Uploads : `multer`
- Validation : `zod`

## Démarrage

```bash
cd backend
cp .env.example .env        # ajustez les valeurs (Mongo, secrets, CIDR WiFi…)
npm install
npm run seed                # crée admin, formateur, groupe, stagiaires, 1 session
npm run dev                 # démarre l'API sur http://localhost:5000/api
```

Comptes de démonstration (après `npm run seed`) :
- **Admin** : `admin@centre.ma` / `Admin123!`
- **Formateur** : `formateur@centre.ma` / `Formateur123!`
- **Stagiaires** : `stagiaire1..4@centre.ma` / `Stagiaire123!`

## Règles métier clés

| Règle | Implémentation |
|---|---|
| Génération des sessions | `scheduleService` étend un emploi du temps hebdo en sessions datées, détection de conflits salle/formateur/groupe |
| QR dynamique | `qrService` : jeton HMAC tournant toutes les `QR_ROTATION_SECONDS`, borné à `start + 15 min` |
| Règle des 15 min | `jobs/autoAbsence.job.js` (node-cron) : marque `absent_injustifie` les stagiaires non scannés |
| Anti-fraude WiFi | `middleware/wifiGuard.js` : l'endpoint `/scan` exige une IP dans `CAMPUS_CIDRS` |
| Anti-fraude compte | après un scan, `scanLockUntil` bloque la déconnexion jusqu'à expiration du QR |
| Justifications | `justificationService` : soumission (texte + fichiers) → file admin → approbation/refus |
| Alertes | `alertService` : seuil proche → stagiaire ; limite stricte → tous les admins |

## Principaux endpoints (`/api`)

| Groupe | Routes |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Utilisateurs | `GET/POST/PATCH/DELETE /users`, `POST /users/bulk` (admin) |
| Référence | CRUD `/groupes`, `/salles`, `/modules` |
| Emploi du temps | `POST /schedule/upload`, `POST /schedule/generate-sessions` |
| Sessions / QR | `GET /sessions`, `GET /sessions/:id`, `POST /sessions/:id/activate`, `GET /sessions/:id/qr` |
| Présence | `POST /sessions/:id/scan` (WiFi), `GET /sessions/:id/attendance` |
| Justifications | `POST /justifications`, `GET /justifications/me`, `GET /justifications`, `PATCH /justifications/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Annonces | `GET/POST/PATCH/DELETE /posts` |
| Analytique | `/analytics/modules`, `/analytics/timeslots`, `/analytics/groupes`, `/analytics/stagiaires`, `/analytics/formateur/me` |

## Test rapide du flux de présence

```bash
# 1. Connexion admin -> token
curl -s -X POST localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@centre.ma","password":"Admin123!"}'

# 2. Activer la session (ID affiché par le seed)
curl -X POST localhost:5000/api/sessions/<ID>/activate -H "Authorization: Bearer <TOKEN_ADMIN>"

# 3. Récupérer le QR courant (token tournant)
curl localhost:5000/api/sessions/<ID>/qr -H "Authorization: Bearer <TOKEN_ADMIN>"

# 4. Scanner en tant que stagiaire (depuis une IP du CAMPUS_CIDRS)
curl -X POST localhost:5000/api/sessions/<ID>/scan \
  -H "Authorization: Bearer <TOKEN_STAGIAIRE>" \
  -H 'Content-Type: application/json' -d '{"token":"<TOKEN_QR>"}'
```

> Pour tester la règle des 15 minutes rapidement, réduisez `SESSION_SCAN_WINDOW_MINUTES`
> dans `.env` (ex. `1`) et laissez passer le délai : le job marquera les absents.

## Variables d'environnement
Voir [.env.example](.env.example) — Mongo, secrets JWT/QR, fenêtres de temps, seuils d'absence,
plages CIDR du WiFi du centre et expression cron du job.
