// Jeu de données de démonstration.
// Usage : npm run seed
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import { User, Groupe, Salle, Module, Session, Affectation } from '../models/index.js';
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
  ]);

  // --- Admin ---
  await creerUtilisateur(
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
    { nom: 'JavaScript', code: 'JS-101', formateur: fBenali._id, salles: [salles[0]._id, salles[1]._id] },
    { nom: 'React', code: 'REACT-201', formateur: fBenali._id, salles: [salles[0]._id, salles[1]._id] },
    { nom: 'Node.js & API', code: 'NODE-202', formateur: fAlaoui._id, salles: [salles[1]._id, salles[2]._id] },
    { nom: 'Bases de données', code: 'BDD-110', formateur: fAlaoui._id, salles: [salles[1]._id, salles[2]._id] },
    { nom: 'Réseaux TCP/IP', code: 'NET-101', formateur: fIdrissi._id, salles: [salles[2]._id, salles[3]._id] },
    { nom: 'Administration Linux', code: 'LINUX-120', formateur: fIdrissi._id, salles: [salles[2]._id, salles[3]._id] },
    { nom: 'Python & Data', code: 'PY-101', formateur: fTazi._id, salles: [salles[0]._id, salles[3]._id] },
    { nom: 'Machine Learning', code: 'ML-201', formateur: fHaddad._id, salles: [salles[1]._id, salles[3]._id] },
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
  let compteur = 1;
  for (const groupe of groupes) {
    const ids = [];
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
      ids.push(s._id);
      compteur += 1;
    }
    groupe.stagiaires = ids;
    await groupe.save();
  }

  // --- Génération automatique de l'emploi du temps de la semaine courante ---
  const { count, nonPlanifies } = await autoGenererEmploiDuTemps(new Date());

  console.log('--- Données de démonstration créées ---');
  console.log(`Salles     : ${salles.length} · Groupes : ${groupes.length} · Formateurs : ${formateurs.length} · Modules : ${modules.length}`);
  console.log(`Affectations: ${affectations.length}`);
  console.log(`Emploi du temps : ${count} sessions générées` + (nonPlanifies.length ? `, ${nonPlanifies.length} non planifiée(s)` : ''));
  if (nonPlanifies.length) {
    nonPlanifies.forEach((n) => console.log(`  ⚠ ${n.groupe} / ${n.module} (${n.formateur}) — ${n.raison}`));
  }
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
