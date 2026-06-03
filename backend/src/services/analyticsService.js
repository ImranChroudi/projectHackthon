import { ATTENDANCE_STATUS } from '../config/constants.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { Groupe } from '../models/Groupe.js';

// Statuts considérés comme "absence" pour les statistiques.
const ABSENT_STATUSES = [
  ATTENDANCE_STATUS.ABSENT_INJUSTIFIE,
  ATTENDANCE_STATUS.ABSENT_JUSTIFIE,
  ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE,
];

// Bloc d'agrégation réutilisable : total / absences / taux.
const compteurs = {
  total: { $sum: 1 },
  absences: {
    $sum: { $cond: [{ $in: ['$status', ABSENT_STATUSES] }, 1, 0] },
  },
  absInjustifiees: {
    $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.ABSENT_INJUSTIFIE] }, 1, 0] },
  },
};

const withTaux = {
  $addFields: {
    taux: {
      $cond: [{ $eq: ['$total', 0] }, 0, { $divide: ['$absences', '$total'] }],
    },
  },
};

// 1) Modules avec le taux d'absence le plus élevé.
export async function modulesParAbsence(match = {}) {
  return Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$module', ...compteurs } },
    withTaux,
    { $sort: { taux: -1, absences: -1 } },
    { $lookup: { from: 'modules', localField: '_id', foreignField: '_id', as: 'module' } },
    { $unwind: { path: '$module', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, total: 1, absences: 1, absInjustifiees: 1, taux: 1, 'module.nom': 1, 'module.code': 1 } },
  ]);
}

// 2) Jours / créneaux horaires avec le plus d'absences.
//    $dayOfWeek : 1 = dimanche ... 7 = samedi (Mongo).
export async function creneauxParAbsence(match = {}) {
  return Attendance.aggregate([
    { $match: { ...match, sessionStart: { $ne: null } } },
    {
      $group: {
        _id: {
          jour: { $dayOfWeek: '$sessionStart' },
          heure: { $hour: '$sessionStart' },
        },
        ...compteurs,
      },
    },
    withTaux,
    { $sort: { absences: -1 } },
  ]);
}

// 3) Groupes avec le plus grand nombre total d'absences.
export async function groupesParAbsence(match = {}) {
  // Cas global (admin) : on part de la liste des groupes pour TOUS les inclure,
  // même ceux sans aucune présence enregistrée (0 absence). On évite ainsi de
  // n'afficher que les groupes déjà présents dans les fiches et d'exposer des
  // groupes orphelins (fiches pointant vers un groupe supprimé).
  if (Object.keys(match).length === 0) {
    return Groupe.aggregate([
      { $lookup: { from: 'attendances', localField: '_id', foreignField: 'groupe', as: 'records' } },
      {
        $addFields: {
          total: { $size: '$records' },
          absences: {
            $size: { $filter: { input: '$records', as: 'r', cond: { $in: ['$$r.status', ABSENT_STATUSES] } } },
          },
          absInjustifiees: {
            $size: {
              $filter: {
                input: '$records',
                as: 'r',
                cond: { $eq: ['$$r.status', ATTENDANCE_STATUS.ABSENT_INJUSTIFIE] },
              },
            },
          },
        },
      },
      withTaux,
      { $sort: { absences: -1, code: 1 } },
      {
        $project: {
          _id: 1, total: 1, absences: 1, absInjustifiees: 1, taux: 1,
          groupe: { nom: '$nom', code: '$code' },
        },
      },
    ]);
  }
  // Cas filtré (périmètre d'un formateur) : agrégation sur les présences concernées.
  return Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$groupe', ...compteurs } },
    withTaux,
    { $sort: { absences: -1 } },
    { $lookup: { from: 'groupes', localField: '_id', foreignField: '_id', as: 'groupe' } },
    { $unwind: { path: '$groupe', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, total: 1, absences: 1, absInjustifiees: 1, taux: 1, 'groupe.nom': 1, 'groupe.code': 1 } },
  ]);
}

// 4) Stagiaires avec le plus d'absences.
export async function stagiairesParAbsence(match = {}, limit = 20) {
  // Si aucun filtre, on s'appuie sur le compteur dénormalisé (rapide).
  if (Object.keys(match).length === 0) {
    const users = await User.find({ role: 'stagiaire' })
      .sort({ absenceCount: -1 })
      .limit(limit)
      .select('nom prenom email absenceCount groupe')
      .populate('groupe', 'nom code');
    return users.map((u) => ({
      _id: u._id,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      absInjustifiees: u.absenceCount,
      groupe: u.groupe,
    }));
  }
  // Sinon agrégation filtrée (ex. périmètre d'un formateur).
  return Attendance.aggregate([
    { $match: match },
    { $group: { _id: '$stagiaire', ...compteurs } },
    { $sort: { absences: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'stagiaire' } },
    { $unwind: '$stagiaire' },
    { $project: { _id: 1, total: 1, absences: 1, absInjustifiees: 1, 'stagiaire.nom': 1, 'stagiaire.prenom': 1, 'stagiaire.email': 1 } },
  ]);
}

// 5) Tableau de bord formateur : restreint à ses groupes + modules assignés.
export async function dashboardFormateur(formateur) {
  const match = {};
  const or = [];
  if (formateur.modulesAssigned?.length) or.push({ module: { $in: formateur.modulesAssigned } });
  if (formateur.groupesAssigned?.length) or.push({ groupe: { $in: formateur.groupesAssigned } });
  // À défaut d'affectations, on retombe sur les sessions dont il est le formateur.
  if (or.length) match.$or = or;
  else match.formateur = formateur._id;

  const [modules, creneaux, groupes, stagiaires] = await Promise.all([
    modulesParAbsence(match),
    creneauxParAbsence(match),
    groupesParAbsence(match),
    stagiairesParAbsence(match),
  ]);
  return { perimetre: match, modules, creneaux, groupes, stagiaires };
}
