import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
  ROLES,
  ATTENDANCE_STATUS,
  JUSTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  POST_AUDIENCE,
  JOURS_OUVRES,
  CRENEAUX,
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

const LAST_NAMES = [
  'Benali', 'Alaoui', 'Idrissi', 'Tazi', 'Haddad', 'ElMansouri', 'Chaqroun', 'Rifai', 'Dahbi', 'Saadi',
  'Ouazzani', 'Ziani', 'ElKhattabi', 'Fassi', 'Ayoubi', 'Baaziz', 'Mansour', 'Bouhssine', 'Aziz', 'Meziane',
  'Rabet', 'Najib', 'Boukili', 'ElMorabit', 'AitMansour', 'Oujidi', 'ElAmrani', 'Mouline', 'Bouazza', 'Sebti',
];
const FIRST_NAMES = [
  'Youssef', 'Sara', 'Omar', 'Nadia', 'Laila', 'Ahmed', 'Meriem', 'Rim', 'Hassan', 'Kamal',
  'Rachid', 'Imane', 'Samir', 'Yasmine', 'Nour', 'Ali', 'Soukaina', 'Rania', 'Anas', 'Salma',
  'Meriem', 'Safa', 'Karim', 'Lina', 'Amine', 'Ghita', 'Hassan', 'Dounia', 'Nabil', 'Fouad',
];
const MODULE_TITLES = [
  'JavaScript Avancé', 'React.js', 'Node.js & Express', 'MongoDB', 'SQL Avancé',
  'Linux Administration', 'Réseaux TCP/IP', 'Sécurité Système', 'Python pour la Data',
  'Machine Learning', 'Analyse de Données', 'UX/UI Design', 'Méthodes Agiles',
  'Architecture REST', 'Tests & Qualité', 'DevOps Introduction', 'Docker', 'Kubernetes',
  'Cloud Basics', 'Gestion de Projet', 'Administration Réseau', 'CyberSécurité',
  'Intelligence Artificielle', 'Big Data', 'Front-End Moderne', 'Back-End Moderne',
  'Mobile Development', 'Web Performance', 'SEO Technique', 'Communication Pro',
  'Anglais Technique', 'Gestion du Temps', 'Leadership', 'Entrepreneuriat',
  'Simulation Projet', 'Analyse Financière', 'Ethique Tech', 'Automatisation',
  'IoT Basics', 'Blockchain Intro', 'Tests Unitaires', 'API GraphQL', 'Architecture Microservices',
  'Systèmes Distribués', 'Gestion de Configuration', 'CI/CD', 'Optimisation SQL',
  'Visualisation de Données', 'Design Thinking', 'Innovation', 'ChatGPT pour Projets',
  'Data Warehousing', 'Marketing Digital', 'Simulation de Cas Client', 'Prise de Parole',
];
const NOTIFICATION_MESSAGES = [
  'Votre présence a été validée.',
  'Nouvelle session planifiée pour votre groupe.',
  'Votre demande de justification a été approuvée.',
  'Votre demande de justification est en attente de validation.',
  'Un nouveau message de votre formateur est disponible.',
  'Une salle a changé pour une de vos sessions.',
  'Rappel : n’oubliez pas de scanner le QR code avant le début de la session.',
  'Votre seuil d’absences injustifiées est proche du seuil d’alerte.',
  'Un administrateur a publié une annonce importante.',
  'Les résultats des évaluations sont maintenant accessibles.',
];
const POST_TITLES = [
  'Bienvenue à la semaine intensive',
  'Rappel : sécurité réseau',
  'Nouvelle ressource disponible',
  'Webinaire de préparation au projet',
  'Statistiques de présence en temps réel',
  'Annonce de maintenance',
  'Guide de bonnes pratiques',
  'Projet collaboratif lancé',
  'Rappel de la réunion générale',
  'Félicitations aux stagiaires du mois',
];
const POST_CONTENTS = [
  'Nous lançons cette semaine une série de modules accélérés pour renforcer les compétences pratiques.',
  'Le centre de formation a renforcé les règles de sécurité informatique. Merci de lire les consignes.',
  'Vous pouvez consulter les nouvelles ressources pédagogiques dans l’espace partagé.',
  'Un webinaire est programmé vendredi pour revoir les notions clés en base de données.',
  'Suivez votre taux de présence et contactez votre formateur si vous avez des questions.',
  'La plateforme sera mise à jour pendant le week-end ; certaines fonctionnalités seront indisponibles.',
  'Le tutorat est disponible chaque après-midi pour vous aider sur vos projets.',
  'Un nouveau défi pratique est publié pour tester vos connaissances en JavaScript.',
  'Merci de vérifier votre emploi du temps et de signaler tout conflit de créneau.',
  'Bravo aux meilleurs participants pour leur assiduité et leurs progrès constants.',
];

const SEED_CONFIG = {
  groupCount: 20,
  modulesPerGroup: 4,
  stagiairesPerGroup: 20,
  formateurCount: 24,
  salleCount: 20,
  weeks: 4,
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];
const randomChance = (percent) => Math.random() * 100 < percent;

function buildSlotDate(monday, slotIndex, weekOffset = 0) {
  const slotPerDay = CRENEAUX.length;
  const dayIndex = slotIndex % JOURS_OUVRES.length;
  const timeIndex = Math.floor(slotIndex / JOURS_OUVRES.length) % slotPerDay;
  const [hours, minutes] = CRENEAUX[timeIndex].debut.split(':').map(Number);
  const date = new Date(monday);
  date.setDate(date.getDate() + dayIndex + 7 * weekOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function buildEndDate(start) {
  return new Date(start.getTime() + 150 * 60 * 1000);
}

function createEmail(firstName, lastName, index, role) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '.');
  return `${base}${index}@centre.ma`;
}

function buildFullName(first, last) {
  return `${first} ${last}`;
}

async function createUsersAndGroups() {
  const admin = new User({
    nom: 'Centre',
    prenom: 'Admin',
    email: env.seedAdminEmail,
    role: ROLES.ADMIN,
  });
  await admin.setPassword(env.seedAdminPassword);
  await admin.save();

  const formateurs = [];
  for (let i = 0; i < SEED_CONFIG.formateurCount; i += 1) {
    const prenom = FIRST_NAMES[i % FIRST_NAMES.length];
    const nom = LAST_NAMES[(i + 7) % LAST_NAMES.length];
    const email = createEmail(prenom, nom, i + 1, ROLES.FORMATEUR);
    const formateur = new User({
      nom,
      prenom,
      email,
      role: ROLES.FORMATEUR,
      heuresHebdo: 25,
    });
    await formateur.setPassword('Formateur123!');
    formateurs.push(formateur);
  }
  await User.insertMany(formateurs);

  const groupes = [];
  for (let i = 0; i < SEED_CONFIG.groupCount; i += 1) {
    groupes.push({
      nom: `Groupe ${i + 1}`,
      code: `GRP-${String(i + 1).padStart(3, '0')}`,
      stagiaires: [],
    });
  }
  const createdGroupes = await Groupe.create(groupes);

  const salles = [];
  for (let i = 0; i < SEED_CONFIG.salleCount; i += 1) {
    salles.push({
      nom: `Salle ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      code: `S${i + 1}`,
      capacite: 15 + randomInt(10, 25),
    });
  }
  const createdSalles = await Salle.create(salles);

  return { admin, formateurs, groupes: createdGroupes, salles: createdSalles };
}

async function createModulesAndAffectations(formateurs, groupes, salles) {
  const modules = [];
  const affectations = [];
  const allModules = [...MODULE_TITLES];

  for (let gIndex = 0; gIndex < groupes.length; gIndex += 1) {
    for (let m = 0; m < SEED_CONFIG.modulesPerGroup; m += 1) {
      const titleIndex = (gIndex * SEED_CONFIG.modulesPerGroup + m) % allModules.length;
      const nom = allModules[titleIndex] + ` ${gIndex + 1}.${m + 1}`;
      const code = `MOD-${String(gIndex * SEED_CONFIG.modulesPerGroup + m + 1).padStart(3, '0')}`;
      const formateur = formateurs[(gIndex + m) % formateurs.length];
      const salleIndex = (gIndex + m) % salles.length;
      const otherSalleIndex = (salleIndex + 1) % salles.length;
      modules.push({
        nom,
        code,
        formateur: formateur._id,
        salles: [salles[salleIndex]._id, salles[otherSalleIndex]._id],
      });
    }
  }

  const createdModules = await Module.create(modules);

  for (let gIndex = 0; gIndex < groupes.length; gIndex += 1) {
    const groupe = groupes[gIndex];
    const startIndex = gIndex * SEED_CONFIG.modulesPerGroup;
    for (let m = 0; m < SEED_CONFIG.modulesPerGroup; m += 1) {
      const module = createdModules[startIndex + m];
      const formateurId = module.formateur;
      affectations.push({
        groupe: groupe._id,
        module: module._id,
        formateur: formateurId,
        heuresParSemaine: 2.5,
      });
    }
  }

  const createdAffectations = await Affectation.create(affectations);

  const moduleIdsByFormateur = new Map();
  const groupeIdsByFormateur = new Map();
  createdAffectations.forEach((aff) => {
    const fid = String(aff.formateur);
    moduleIdsByFormateur.set(fid, [...(moduleIdsByFormateur.get(fid) || []), aff.module]);
    groupeIdsByFormateur.set(fid, [...(groupeIdsByFormateur.get(fid) || []), aff.groupe]);
  });

  await Promise.all(
    formateurs.map((formateur) =>
      User.findByIdAndUpdate(formateur._id, {
        modulesAssigned: moduleIdsByFormateur.get(String(formateur._id)) || [],
        groupesAssigned: [...new Set(groupeIdsByFormateur.get(String(formateur._id)) || [])],
      })
    )
  );

  return { modules: createdModules, affectations: createdAffectations };
}

async function createStagiaires(groupes) {
  const stagiaires = [];
  for (let gIndex = 0; gIndex < groupes.length; gIndex += 1) {
    const groupe = groupes[gIndex];
    for (let s = 0; s < SEED_CONFIG.stagiairesPerGroup; s += 1) {
      const prenom = FIRST_NAMES[(gIndex * SEED_CONFIG.stagiairesPerGroup + s) % FIRST_NAMES.length];
      const nom = LAST_NAMES[(gIndex * SEED_CONFIG.stagiairesPerGroup + s + 5) % LAST_NAMES.length];
      const email = createEmail(prenom, nom, gIndex * SEED_CONFIG.stagiairesPerGroup + s + 1, ROLES.STAGIAIRE);
      stagiaires.push({
        nom,
        prenom,
        email,
        role: ROLES.STAGIAIRE,
        groupe: groupe._id,
      });
    }
  }

  const createdStagiaires = [];
  for (const stagiaireData of stagiaires) {
    const user = new User(stagiaireData);
    await user.setPassword('Stagiaire123!');
    await user.save();
    createdStagiaires.push(user);
  }

  let cursor = 0;
  for (let gIndex = 0; gIndex < groupes.length; gIndex += 1) {
    const ids = createdStagiaires.slice(cursor, cursor + SEED_CONFIG.stagiairesPerGroup).map((user) => user._id);
    groupes[gIndex].stagiaires = ids;
    cursor += SEED_CONFIG.stagiairesPerGroup;
  }

  await Promise.all(groupes.map((g) => Groupe.findByIdAndUpdate(g._id, { stagiaires: g.stagiaires })));

  return createdStagiaires;
}

function buildScheduleSlots() {
  const slots = [];
  for (let day = 0; day < JOURS_OUVRES.length; day += 1) {
    for (let time = 0; time < CRENEAUX.length; time += 1) {
      slots.push({ day, time });
    }
  }
  return slots;
}

async function createSessionsAndAttendances(groupes, modules, salles, formateurs) {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const slots = buildScheduleSlots();
  const totalSlots = slots.length;
  const roomUsage = new Map();
  const formateurAvailability = new Map();
  formateurs.forEach((formateur) => {
    formateurAvailability.set(String(formateur._id), new Set(slots.map((_, index) => index)));
  });

  const sessions = [];
  const attendances = [];
  const justifications = [];
  const formateurGroupMap = new Map();

  for (let week = 0; week < SEED_CONFIG.weeks; week += 1) {
    for (let gIndex = 0; gIndex < groupes.length; gIndex += 1) {
      const groupe = groupes[gIndex];
      const groupModules = modules.slice(gIndex * SEED_CONFIG.modulesPerGroup, gIndex * SEED_CONFIG.modulesPerGroup + SEED_CONFIG.modulesPerGroup);
      const usedSlots = new Set();

      for (let mIndex = 0; mIndex < groupModules.length; mIndex += 1) {
        const module = groupModules[mIndex];
        const candidateSlots = slots.map((_, slotIndex) => slotIndex).filter((slotIndex) => {
          const formateurSlots = formateurAvailability.get(String(module.formateur));
          return formateurSlots.has(slotIndex) && !usedSlots.has(slotIndex);
        });
        if (!candidateSlots.length) {
          throw new Error('Impossible de placer toutes les sessions, augmentez le nombre de créneaux ou ajustez les paramètres.');
        }

        const slotIndex = candidateSlots[(gIndex + mIndex + week) % candidateSlots.length];
        usedSlots.add(slotIndex);
        formateurAvailability.get(String(module.formateur)).delete(slotIndex);

        const slotKey = `${week}-${slotIndex}`;
        const roomIndex = (roomUsage.get(slotKey) || 0) % salles.length;
        roomUsage.set(slotKey, roomIndex + 1);
        const salle = salles[roomIndex];

        const start = buildSlotDate(monday, slotIndex, week);
        const end = buildEndDate(start);

        const session = {
          formateur: module.formateur,
          groupe: groupe._id,
          salle: salle._id,
          module: module._id,
          start,
          end,
          status: 'planifie',
        };
        sessions.push(session);
      }
    }
  }

  const createdSessions = await Session.create(sessions);

  for (const session of createdSessions) {
    const groupe = groupes.find((g) => String(g._id) === String(session.groupe));
    const module = modules.find((m) => String(m._id) === String(session.module));
    const formateurId = module.formateur;

    session.status = session.status || 'planifie';
    const groupeStagiaires = groupe.stagiaires;
    for (const stagiaireId of groupeStagiaires) {
      const rand = Math.random();
      let status = ATTENDANCE_STATUS.PRESENT;
      if (rand < 0.12) status = ATTENDANCE_STATUS.RETARD;
      else if (rand < 0.26) status = ATTENDANCE_STATUS.ABSENT_INJUSTIFIE;
      else if (rand < 0.34) status = ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE;
      else if (rand < 0.40) status = ATTENDANCE_STATUS.ABSENT_JUSTIFIE;

      const attendance = {
        session: session._id,
        stagiaire: stagiaireId,
        groupe: session.groupe,
        module: session.module,
        formateur: formateurId,
        sessionStart: session.start,
        status,
        scannedAt: status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.RETARD ? new Date(session.start.getTime() + randomInt(1, 12) * 60 * 1000) : null,
        scanIp: status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.RETARD ? `192.168.${randomInt(0, 255)}.${randomInt(1, 254)}` : null,
      };
      attendances.push(attendance);
    }
  }

  const createdAttendances = await Attendance.insertMany(attendances, { ordered: false });

  const attendedByStatus = new Map();
  for (const attendance of createdAttendances) {
    if ([ATTENDANCE_STATUS.ABSENT_INJUSTIFIE, ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE, ATTENDANCE_STATUS.ABSENT_JUSTIFIE].includes(attendance.status)) {
      if (randomChance(55)) {
        let statut = JUSTIFICATION_STATUS.EN_ATTENTE;
        let reviewedBy = null;
        let reviewedAt = null;
        let motifRefus = '';
        if (randomChance(55)) {
          statut = randomChance(65) ? JUSTIFICATION_STATUS.APPROUVE : JUSTIFICATION_STATUS.REFUSE;
          reviewedBy = formateurs[randomInt(0, formateurs.length - 1)]._id;
          reviewedAt = new Date(attendance.createdAt || Date.now());
          motifRefus = statut === JUSTIFICATION_STATUS.REFUSE ? 'Le justificatif ne correspond pas aux critères attendus.' : '';
        }
        const justification = {
          attendance: attendance._id,
          stagiaire: attendance.stagiaire,
          texte: 'Absence déclarée pour raison personnelle / rendez-vous médical.',
          documents: [
            {
              filename: `justif-${attendance._id}.pdf`,
              originalName: 'attestation.pdf',
              path: `uploads/justifications/justif-${attendance._id}.pdf`,
              mimetype: 'application/pdf',
              size: 124000,
            },
          ],
          statut,
          reviewedBy,
          reviewedAt,
          motifRefus,
        };
        justifications.push(justification);
      }
    }
  }

  const createdJustifications = justifications.length ? await Justification.create(justifications) : [];

  if (createdJustifications.length) {
    await Promise.all(
      createdJustifications.map((justif) =>
        Attendance.findByIdAndUpdate(justif.attendance, { justification: justif._id })
      )
    );
  }

  return { createdSessions, createdAttendances, createdJustifications };
}

async function createNotificationsAndPosts(admin, formateurs, stagiaires) {
  const notifications = [];
  const authorPool = [admin, ...formateurs];

  [...formateurs, ...stagiaires].forEach((user) => {
    const count = 3 + randomInt(0, 2);
    for (let i = 0; i < count; i += 1) {
      notifications.push({
        user: user._id,
        type: randomChoice(Object.values(NOTIFICATION_TYPE)),
        message: randomChoice(NOTIFICATION_MESSAGES),
        lu: randomChance(35),
        meta: randomChance(40) ? { sessionHint: `session-${randomInt(1, 900)}` } : {},
      });
    }
  });

  const createdNotifications = await Notification.create(notifications);

  const posts = [];
  for (let i = 0; i < 40; i += 1) {
    const author = randomChoice(authorPool);
    posts.push({
      auteur: author._id,
      titre: POST_TITLES[i % POST_TITLES.length],
      contenu: POST_CONTENTS[i % POST_CONTENTS.length],
      audience: randomChoice(Object.values(POST_AUDIENCE)),
    });
  }

  const createdPosts = await Post.create(posts);
  return { createdNotifications, createdPosts };
}

async function run() {
  await connectDB();

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

  const { admin, formateurs, groupes, salles } = await createUsersAndGroups();
  const stagiaires = await createStagiaires(groupes);
  const { modules } = await createModulesAndAffectations(formateurs, groupes, salles);
  const { createdSessions, createdAttendances, createdJustifications } = await createSessionsAndAttendances(groupes, modules, salles, formateurs);
  const { createdNotifications, createdPosts } = await createNotificationsAndPosts(admin, formateurs, stagiaires);

  console.log('--- Données factices générées avec succès ---');
  console.log(`Admin         : 1`);
  console.log(`Formateurs    : ${formateurs.length}`);
  console.log(`Stagiaires    : ${stagiaires.length}`);
  console.log(`Groupes       : ${groupes.length}`);
  console.log(`Salles        : ${salles.length}`);
  console.log(`Modules       : ${modules.length}`);
  console.log(`Sessions      : ${createdSessions.length}`);
  console.log(`Présences     : ${createdAttendances.length}`);
  console.log(`Justifications: ${createdJustifications.length}`);
  console.log(`Notifications : ${createdNotifications.length}`);
  console.log(`Posts         : ${createdPosts.length}`);
  console.log('Admin        :', env.seedAdminEmail, '/', env.seedAdminPassword);
  console.log('Formateur(s) : formateur1.. / Formateur123!');
  console.log('Stagiaire(s) : stagiaire1.. / Stagiaire123!');

  await disconnectDB();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
