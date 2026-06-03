// Jeu de données de démonstration.
// Usage : npm run seed
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
  ROLES,
  SESSION_STATUS,
  ATTENDANCE_STATUS,
  JUSTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  POST_AUDIENCE,
} from '../config/constants.js';
import {
  User,
  Groupe,
  Salle,
  Module,
  Session,
  Affectation,
  Attendance,
  Justification,
  Notification,
  Post,
} from '../models/index.js';
import { autoGenererEmploiDuTemps } from '../services/scheduleService.js';

async function creerUtilisateur(data, motDePasse) {
  const u = new User(data);
  await u.setPassword(motDePasse);
  await u.save();
  return u;
}

async function run() {
  await connectDB();

  // Nettoyage (démo uniquement).
  await Promise.all([
    User.deleteMany({}),
    Groupe.deleteMany({}),
    Salle.deleteMany({}),
    Module.deleteMany({}),
    Session.deleteMany({}),
    Affectation.deleteMany({}),
    Attendance.deleteMany({}),
    Justification.deleteMany({}),
    Notification.deleteMany({}),
    Post.deleteMany({}),
  ]);

  // --- Admin ---
  const admin = await creerUtilisateur(
    { nom: 'Centre', prenom: 'Admin', email: env.seedAdminEmail, role: ROLES.ADMIN },
    env.seedAdminPassword
  );

  // --- Salles (capacités variées) ---
  const salles = await Salle.create([
    { nom: 'Salle A1', code: 'A1', capacite: 30 },
    { nom: 'Salle A2', code: 'A2', capacite: 24 },
    { nom: 'Salle B1', code: 'B1', capacite: 20 },
    { nom: 'Laboratoire', code: 'LAB', capacite: 16 },
  ]);

  // --- Groupes ---
  const groupes = await Groupe.create([
    { nom: 'Développement Full-Stack', code: 'DEV-FS-1' },
    { nom: 'Réseaux & Systèmes', code: 'RS-1' },
    { nom: 'Data & IA', code: 'DATA-1' },
  ]);
  const [gDev, gReseaux, gData] = groupes;

  // --- Formateurs (plafond 25 h/semaine) ---
  const formateursData = [
    { nom: 'Benali', prenom: 'Karim', email: 'formateur@centre.ma', pwd: 'Formateur123!' },
    { nom: 'Alaoui', prenom: 'Sara', email: 'formateur2@centre.ma', pwd: 'Formateur123!' },
    { nom: 'Idrissi', prenom: 'Youssef', email: 'formateur3@centre.ma', pwd: 'Formateur123!' },
    { nom: 'Tazi', prenom: 'Nadia', email: 'formateur4@centre.ma', pwd: 'Formateur123!' },
    { nom: 'Haddad', prenom: 'Omar', email: 'formateur5@centre.ma', pwd: 'Formateur123!' },
  ];
  const formateurs = [];
  for (const f of formateursData) {
    formateurs.push(
      await creerUtilisateur(
        { nom: f.nom, prenom: f.prenom, email: f.email, role: ROLES.FORMATEUR, heuresHebdo: 25 },
        f.pwd
      )
    );
  }
  const [fBenali, fAlaoui, fIdrissi, fTazi, fHaddad] = formateurs;

  // --- Modules ---
  const modulesData = [
    { nom: 'JavaScript', code: 'JS-101', formateur: fBenali._id },
    { nom: 'React', code: 'REACT-201', formateur: fBenali._id },
    { nom: 'Node.js & API', code: 'NODE-202', formateur: fAlaoui._id },
    { nom: 'Bases de données', code: 'BDD-110', formateur: fAlaoui._id },
    { nom: 'Réseaux TCP/IP', code: 'NET-101', formateur: fIdrissi._id },
    { nom: 'Administration Linux', code: 'LINUX-120', formateur: fIdrissi._id },
    { nom: 'Python & Data', code: 'PY-101', formateur: fTazi._id },
    { nom: 'Machine Learning', code: 'ML-201', formateur: fHaddad._id },
  ];
  const modules = await Module.create(modulesData);
  const byCode = Object.fromEntries(modules.map((m) => [m.code, m]));

  // --- Affectations (groupe / module / formateur / heures/semaine) ---
  // Volume calibré pour rester sous 25 h/formateur.
  const affectations = [
    // Groupe Dev Full-Stack
    { groupe: gDev._id, module: byCode['JS-101']._id, formateur: fBenali._id, heuresParSemaine: 5 },
    { groupe: gDev._id, module: byCode['REACT-201']._id, formateur: fBenali._id, heuresParSemaine: 5 },
    { groupe: gDev._id, module: byCode['NODE-202']._id, formateur: fAlaoui._id, heuresParSemaine: 5 },
    { groupe: gDev._id, module: byCode['BDD-110']._id, formateur: fAlaoui._id, heuresParSemaine: 2.5 },
    // Groupe Réseaux
    { groupe: gReseaux._id, module: byCode['NET-101']._id, formateur: fIdrissi._id, heuresParSemaine: 7.5 },
    { groupe: gReseaux._id, module: byCode['LINUX-120']._id, formateur: fIdrissi._id, heuresParSemaine: 5 },
    { groupe: gReseaux._id, module: byCode['BDD-110']._id, formateur: fAlaoui._id, heuresParSemaine: 2.5 },
    // Groupe Data
    { groupe: gData._id, module: byCode['PY-101']._id, formateur: fTazi._id, heuresParSemaine: 7.5 },
    { groupe: gData._id, module: byCode['ML-201']._id, formateur: fHaddad._id, heuresParSemaine: 7.5 },
    { groupe: gData._id, module: byCode['JS-101']._id, formateur: fBenali._id, heuresParSemaine: 2.5 },
  ];
  await Affectation.create(affectations);

  // --- Affectations de tableau de bord (périmètre formateur) ---
  fBenali.modulesAssigned = [byCode['JS-101']._id, byCode['REACT-201']._id];
  fBenali.groupesAssigned = [gDev._id, gData._id];
  fAlaoui.modulesAssigned = [byCode['NODE-202']._id, byCode['BDD-110']._id];
  fAlaoui.groupesAssigned = [gDev._id, gReseaux._id];
  fIdrissi.modulesAssigned = [byCode['NET-101']._id, byCode['LINUX-120']._id];
  fIdrissi.groupesAssigned = [gReseaux._id];
  fTazi.modulesAssigned = [byCode['PY-101']._id];
  fTazi.groupesAssigned = [gData._id];
  fHaddad.modulesAssigned = [byCode['ML-201']._id];
  fHaddad.groupesAssigned = [gData._id];
  await Promise.all(formateurs.map((f) => f.save()));

  // --- Stagiaires (répartis par groupe) ---
  const stagiairesByGroupe = {}; // String(groupeId) -> [docs User]
  let compteur = 1;
  for (const groupe of groupes) {
    const docs = [];
    for (let i = 0; i < 5; i += 1) {
      const s = await creerUtilisateur(
        {
          nom: `Nom${compteur}`,
          prenom: `Stagiaire${compteur}`,
          email: `stagiaire${compteur}@centre.ma`,
          role: ROLES.STAGIAIRE,
          groupe: groupe._id,
        },
        'Stagiaire123!'
      );
      docs.push(s);
      compteur += 1;
    }
    groupe.stagiaires = docs.map((d) => d._id);
    await groupe.save();
    stagiairesByGroupe[String(groupe._id)] = docs;
  }

  // --- Génération automatique de l'emploi du temps de la semaine courante ---
  const { count, nonPlanifies } = await autoGenererEmploiDuTemps(new Date());

  // =========================================================================
  // Historique de présence (semaines passées) — alimente l'interface formateur
  // (« Absences »), les justifications, les notifications et les analyses.
  // =========================================================================
  const now = new Date();

  // Distribution déterministe d'un statut de présence à partir d'une graine.
  // Le drapeau `aRisque` concentre les absences (profil « à risque » à tester).
  const statutPour = (graine, aRisque) => {
    const r = aRisque ? graine % 45 : graine % 100;
    if (r < 14) return ATTENDANCE_STATUS.ABSENT_INJUSTIFIE;
    if (r < 22) return ATTENDANCE_STATUS.ABSENT_JUSTIFIE;
    if (r < 30) return ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE;
    if (r < 42) return ATTENDANCE_STATUS.RETARD;
    return ATTENDANCE_STATUS.PRESENT;
  };

  let nbSessionsPassees = 0;
  let nbAttendance = 0;
  let nbJustifs = 0;
  let salleIdx = 0;
  const absInjustParStagiaire = new Map(); // userId -> nombre d'absences injustifiées

  // 5 séances passées par affectation, étalées sur les ~5 dernières semaines.
  for (let a = 0; a < affectations.length; a += 1) {
    const aff = affectations[a];
    const stagiaires = stagiairesByGroupe[String(aff.groupe)] || [];

    for (let k = 0; k < 5; k += 1) {
      const start = new Date(now);
      start.setDate(start.getDate() - (4 + k * 7 + (a % 3)));
      start.setHours(8 + (a % 4) * 2, 30, 0, 0);
      const end = new Date(start.getTime() + 2.5 * 3600 * 1000);
      const salle = salles[salleIdx % salles.length];
      salleIdx += 1;

      const session = await Session.create({
        formateur: aff.formateur,
        groupe: aff.groupe,
        salle: salle._id,
        module: aff.module,
        start,
        end,
        status: SESSION_STATUS.TERMINE,
        absenceProcessed: true,
      });
      nbSessionsPassees += 1;

      for (let i = 0; i < stagiaires.length; i += 1) {
        const st = stagiaires[i];
        const status = statutPour(a * 7 + k * 13 + i * 29 + 3, i === 0);
        const present = status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.RETARD;

        const att = await Attendance.create({
          session: session._id,
          stagiaire: st._id,
          groupe: aff.groupe,
          module: aff.module,
          formateur: aff.formateur,
          sessionStart: start,
          status,
          scannedAt: present ? start : null,
        });
        nbAttendance += 1;

        if (status === ATTENDANCE_STATUS.ABSENT_INJUSTIFIE) {
          const key = String(st._id);
          absInjustParStagiaire.set(key, (absInjustParStagiaire.get(key) || 0) + 1);
        }

        // Justification liée pour les absences justifiées / en attente.
        if (
          status === ATTENDANCE_STATUS.ABSENT_JUSTIFIE ||
          status === ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE
        ) {
          const approuve = status === ATTENDANCE_STATUS.ABSENT_JUSTIFIE;
          const just = await Justification.create({
            attendance: att._id,
            stagiaire: st._id,
            texte: approuve
              ? 'Certificat médical fourni.'
              : 'Problème de transport — justificatif à venir.',
            statut: approuve ? JUSTIFICATION_STATUS.APPROUVE : JUSTIFICATION_STATUS.EN_ATTENTE,
            reviewedBy: approuve ? admin._id : null,
            reviewedAt: approuve ? new Date() : null,
          });
          att.justification = just._id;
          await att.save();
          nbJustifs += 1;
        }
      }
    }
  }

  // Met à jour le compteur dénormalisé d'absences injustifiées + notifications.
  let nbNotifs = 0;
  for (const [userId, nb] of absInjustParStagiaire) {
    await User.findByIdAndUpdate(userId, { absenceCount: nb });
    // Seuils de démo (volontairement bas pour générer des notifications).
    if (nb >= 5) {
      await Notification.create({
        user: userId,
        type: NOTIFICATION_TYPE.LIMITE_ATTEINTE,
        message: `Limite atteinte : ${nb} absences injustifiées. L'administration a été notifiée.`,
        meta: { count: nb },
      });
      nbNotifs += 1;
    } else if (nb >= 3) {
      await Notification.create({
        user: userId,
        type: NOTIFICATION_TYPE.SEUIL_PROCHE,
        message: `Attention : ${nb} absences injustifiées, vous approchez du seuil.`,
        meta: { count: nb },
      });
      nbNotifs += 1;
    }
  }

  // --- Annonces de démonstration ---
  const posts = await Post.create([
    {
      auteur: admin._id,
      titre: 'Bienvenue au centre de formation',
      contenu:
        'Bonne rentrée à toutes et à tous ! Pensez à scanner le QR code à chaque séance pour valider votre présence.',
      audience: POST_AUDIENCE.TOUS,
    },
    {
      auteur: admin._id,
      titre: 'Réunion pédagogique',
      contenu: 'Réunion des formateurs vendredi à 17h en salle B1. Ordre du jour : suivi des absences.',
      audience: POST_AUDIENCE.FORMATEURS,
    },
    {
      auteur: admin._id,
      titre: 'Rappel : règles de présence',
      contenu:
        'Toute absence doit être justifiée sous 48h via l’espace « Justifications ». Au-delà du seuil, l’administration est alertée.',
      audience: POST_AUDIENCE.STAGIAIRES,
    },
  ]);

  console.log('--- Données de démonstration créées ---');
  console.log(`Salles     : ${salles.length} · Groupes : ${groupes.length} · Formateurs : ${formateurs.length} · Modules : ${modules.length}`);
  console.log(`Affectations: ${affectations.length}`);
  console.log(`Emploi du temps : ${count} sessions générées` + (nonPlanifies.length ? `, ${nonPlanifies.length} non planifiée(s)` : ''));
  if (nonPlanifies.length) {
    nonPlanifies.forEach((n) => console.log(`  ⚠ ${n.groupe} / ${n.module} (${n.formateur}) — ${n.raison}`));
  }
  console.log(
    `Historique  : ${nbSessionsPassees} séances passées · ${nbAttendance} présences · ` +
      `${nbJustifs} justification(s) · ${nbNotifs} notification(s) · ${posts.length} annonce(s)`
  );
  console.log('---');
  console.log(`Admin      : ${env.seedAdminEmail} / ${env.seedAdminPassword}`);
  console.log('Formateurs : formateur@centre.ma … formateur5@centre.ma / Formateur123!');
  console.log(`Stagiaires : stagiaire1..${compteur - 1}@centre.ma / Stagiaire123!`);

  await disconnectDB();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
