import { ScheduleTemplate } from '../models/ScheduleTemplate.js';
import { Session } from '../models/Session.js';
import { Affectation } from '../models/Affectation.js';
import { Salle } from '../models/Salle.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import {
  JOURS,
  JOURS_OUVRES,
  CRENEAUX,
  BLOC_HEURES,
  FORMATEUR_HEURES_HEBDO,
  SESSION_STATUS,
} from '../config/constants.js';

// ---------------------------------------------------------------------------
// Helpers temps
// ---------------------------------------------------------------------------

// Construit un Date à partir d'un lundi de référence, d'un jour et d'une heure "HH:mm".
function buildTimestamp(semaineDebut, jour, heure) {
  const offset = JOURS.indexOf(jour); // 0 = lundi
  const [h, m] = heure.split(':').map(Number);
  const d = new Date(semaineDebut);
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d;
}

// Ramène une date au lundi 00:00 de sa semaine.
function lundiDeLaSemaine(input) {
  const d = new Date(input);
  const jour = d.getDay(); // 0 = dimanche, 1 = lundi…
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Liste plate de tous les créneaux de la grille (jours ouvrés × créneaux).
function tousLesCreneaux() {
  const slots = [];
  JOURS_OUVRES.forEach((jour, jourIdx) => {
    CRENEAUX.forEach((creneau, creneauIdx) => {
      slots.push({ jour, jourIdx, creneau, creneauIdx, key: `${jourIdx}-${creneauIdx}` });
    });
  });
  return slots;
}

// Détecte un chevauchement temporel.
function chevauche(a, b) {
  return a.start < b.end && b.start < a.end;
}

// ---------------------------------------------------------------------------
// Modèle d'emploi du temps (saisie manuelle) — conservé
// ---------------------------------------------------------------------------

export async function saveTemplate(data) {
  return ScheduleTemplate.create({
    nom: data.nom,
    semaineDebut: new Date(data.semaineDebut),
    entries: data.entries,
  });
}

function detecterConflitsLocaux(sessions) {
  const conflits = [];
  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      if (!chevauche(a, b)) continue;
      if (
        String(a.formateur) === String(b.formateur) ||
        String(a.groupe) === String(b.groupe) ||
        String(a.salle) === String(b.salle)
      ) {
        conflits.push({ a, b });
      }
    }
  }
  return conflits;
}

// Génère des Sessions concrètes à partir d'un modèle d'emploi du temps.
export async function generateSessions(templateId) {
  const template = await ScheduleTemplate.findById(templateId);
  if (!template) throw new ApiError(404, 'Emploi du temps introuvable.');

  const candidats = template.entries.map((e) => ({
    formateur: e.formateur,
    groupe: e.groupe,
    salle: e.salle,
    module: e.module,
    start: buildTimestamp(template.semaineDebut, e.jour, e.heureDebut),
    end: buildTimestamp(template.semaineDebut, e.jour, e.heureFin),
  }));

  const conflits = detecterConflitsLocaux(candidats);
  if (conflits.length) {
    throw new ApiError(409, "Conflits d'emploi du temps détectés.", {
      conflits: conflits.length,
    });
  }

  const created = await Session.insertMany(candidats);
  return created;
}

// ---------------------------------------------------------------------------
// Génération automatique (solveur glouton « most-constrained-first »)
// ---------------------------------------------------------------------------

export async function autoGenererEmploiDuTemps(semaineDebutInput) {
  const semaineDebut = lundiDeLaSemaine(semaineDebutInput || new Date());

  const affectations = await Affectation.find()
    .populate({ path: 'groupe', select: 'nom code stagiaires' })
    .populate('module', 'nom code salles')
    .populate('formateur', 'nom prenom heuresHebdo');
  if (!affectations.length) throw new ApiError(400, MSG.AUCUNE_AFFECTATION);

  const salles = await Salle.find().sort({ capacite: 1 });
  if (!salles.length) throw new ApiError(400, 'Aucune salle disponible.');

  // 1) Éclate chaque affectation en unités de cours (1 bloc = 2 h 30).
  const unites = [];
  for (const a of affectations) {
    if (!a.groupe || !a.module || !a.formateur) continue;
    const nbBlocs = Math.max(1, Math.round((a.heuresParSemaine || BLOC_HEURES) / BLOC_HEURES));
    for (let i = 0; i < nbBlocs; i += 1) {
      unites.push({ groupe: a.groupe, module: a.module, formateur: a.formateur, index: i });
    }
  }

  // 2) Tri « most-constrained-first » : formateurs les plus chargés d'abord.
  const chargeFormateur = new Map();
  for (const u of unites) {
    const id = String(u.formateur._id);
    chargeFormateur.set(id, (chargeFormateur.get(id) || 0) + BLOC_HEURES);
  }
  unites.sort((x, y) => {
    const cy = chargeFormateur.get(String(y.formateur._id)) || 0;
    const cx = chargeFormateur.get(String(x.formateur._id)) || 0;
    if (cy !== cx) return cy - cx;
    return String(x.groupe._id).localeCompare(String(y.groupe._id));
  });

  // 3) Placement glouton.
  const slots = tousLesCreneaux();
  const busyGroupe = new Map(); // key -> Set(groupeId)
  const busyFormateur = new Map(); // key -> Set(formateurId)
  const busySalle = new Map(); // key -> Set(salleId)
  const heuresFormateur = new Map(); // formateurId -> heures placées
  const groupeModuleJour = new Map(); // `${groupeId}-${moduleId}-${jourIdx}` -> nb

  const placed = [];
  const nonPlanifies = [];

  unites.forEach((u, ui) => {
    const gId = String(u.groupe._id);
    const fId = String(u.formateur._id);
    const mId = String(u.module._id);
    const plafond = u.formateur.heuresHebdo || FORMATEUR_HEURES_HEBDO;
    const taille = (u.groupe.stagiaires || []).length;

    // Rotation des créneaux pour étaler la charge sur la semaine.
    const decalage = ui % slots.length;
    const ordered = slots.slice(decalage).concat(slots.slice(0, decalage));

    const chercher = (respectSoft) => {
      for (const slot of ordered) {
        const k = slot.key;
        if ((busyGroupe.get(k) || EMPTY).has(gId)) continue;
        if ((busyFormateur.get(k) || EMPTY).has(fId)) continue;
        if ((heuresFormateur.get(fId) || 0) + BLOC_HEURES > plafond + 1e-6) continue;
        if (respectSoft && (groupeModuleJour.get(`${gId}-${mId}-${slot.jourIdx}`) || 0) >= 1) continue;
        const occupied = busySalle.get(k) || EMPTY;
        const moduleAllowedSalles = (u.module.salles || []).map((id) => String(id));
        const allowedSalles = moduleAllowedSalles.length
          ? salles.filter((s) => moduleAllowedSalles.includes(String(s._id)))
          : salles;
        let salle = allowedSalles.find((s) => !occupied.has(String(s._id)) && s.capacite >= taille);
        if (!salle && allowedSalles !== salles) salle = salles.find((s) => !occupied.has(String(s._id)) && s.capacite >= taille);
        if (!salle) salle = allowedSalles.find((s) => !occupied.has(String(s._id)));
        if (!salle) salle = salles.find((s) => !occupied.has(String(s._id)));
        if (!salle) continue;
        return { slot, salle };
      }
      return null;
    };

    const res = chercher(true) || chercher(false);
    if (!res) {
      nonPlanifies.push({
        groupe: u.groupe.nom,
        module: u.module.nom,
        formateur: `${u.formateur.prenom} ${u.formateur.nom}`,
        raison: 'Aucun créneau disponible (contraintes salle / formateur / plafond horaire).',
      });
      return;
    }

    const { slot, salle } = res;
    const k = slot.key;
    ajouter(busyGroupe, k, gId);
    ajouter(busyFormateur, k, fId);
    ajouter(busySalle, k, String(salle._id));
    heuresFormateur.set(fId, (heuresFormateur.get(fId) || 0) + BLOC_HEURES);
    const gmj = `${gId}-${mId}-${slot.jourIdx}`;
    groupeModuleJour.set(gmj, (groupeModuleJour.get(gmj) || 0) + 1);

    placed.push({
      formateur: u.formateur._id,
      groupe: u.groupe._id,
      salle: salle._id,
      module: u.module._id,
      start: buildTimestamp(semaineDebut, slot.jour, slot.creneau.debut),
      end: buildTimestamp(semaineDebut, slot.jour, slot.creneau.fin),
      status: SESSION_STATUS.PLANIFIE,
    });
  });

  // 4) Remplace les sessions planifiées de la semaine.
  const finSemaine = new Date(semaineDebut);
  finSemaine.setDate(finSemaine.getDate() + 7);
  await Session.deleteMany({
    status: SESSION_STATUS.PLANIFIE,
    start: { $gte: semaineDebut, $lt: finSemaine },
  });
  const created = placed.length ? await Session.insertMany(placed) : [];

  return { count: created.length, sessions: created, nonPlanifies, semaineDebut };
}

const EMPTY = new Set();
function ajouter(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

// ---------------------------------------------------------------------------
// Conflits, suggestions, édition validée
// ---------------------------------------------------------------------------

// Renvoie les conflits (salle / formateur / groupe) pour un créneau candidat.
export async function trouverConflits(candidate, { excludeId } = {}) {
  const overlapping = await Session.find({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    start: { $lt: candidate.end },
    end: { $gt: candidate.start },
    $or: [
      { salle: candidate.salle },
      { formateur: candidate.formateur },
      { groupe: candidate.groupe },
    ],
  })
    .populate('salle', 'nom code')
    .populate('formateur', 'nom prenom')
    .populate('groupe', 'nom code');

  const conflits = [];
  for (const s of overlapping) {
    if (String(s.salle?._id) === String(candidate.salle)) {
      conflits.push({ type: 'salle', message: MSG.CONFLIT_SALLE, session: s._id });
    }
    if (String(s.formateur?._id) === String(candidate.formateur)) {
      conflits.push({ type: 'formateur', message: MSG.CONFLIT_FORMATEUR, session: s._id });
    }
    if (String(s.groupe?._id) === String(candidate.groupe)) {
      conflits.push({ type: 'groupe', message: MSG.CONFLIT_GROUPE, session: s._id });
    }
  }
  return conflits;
}

// Propose des créneaux libres pour le même groupe + formateur (avec une salle disponible).
export async function suggererCreneaux(candidate, { limit = 5, excludeId } = {}) {
  const semaineDebut = lundiDeLaSemaine(candidate.start);
  const finSemaine = new Date(semaineDebut);
  finSemaine.setDate(finSemaine.getDate() + 7);

  const salles = await Salle.find().sort({ capacite: 1 });
  const weekSessions = await Session.find({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    start: { $gte: semaineDebut, $lt: finSemaine },
  });

  const fId = String(candidate.formateur);
  const gId = String(candidate.groupe);
  const suggestions = [];

  for (const slot of tousLesCreneaux()) {
    if (suggestions.length >= limit) break;
    const start = buildTimestamp(semaineDebut, slot.jour, slot.creneau.debut);
    const end = buildTimestamp(semaineDebut, slot.jour, slot.creneau.fin);
    const overlap = weekSessions.filter((s) => s.start < end && s.end > start);
    if (overlap.some((s) => String(s.formateur) === fId)) continue;
    if (overlap.some((s) => String(s.groupe) === gId)) continue;
    const occupied = new Set(overlap.map((s) => String(s.salle)));
    const salle = salles.find((s) => !occupied.has(String(s._id)));
    if (!salle) continue;
    suggestions.push({
      jour: slot.jour,
      creneau: slot.creneau,
      start,
      end,
      salle: { _id: salle._id, nom: salle.nom, code: salle.code },
    });
  }
  return suggestions;
}

// Vérifie que le formateur ne dépasse pas son plafond hebdomadaire après modification.
async function plafondFormateurRespecte(session, excludeId) {
  const formateur = await User.findById(session.formateur).select('heuresHebdo');
  const plafond = formateur?.heuresHebdo || FORMATEUR_HEURES_HEBDO;
  const semaineDebut = lundiDeLaSemaine(session.start);
  const finSemaine = new Date(semaineDebut);
  finSemaine.setDate(finSemaine.getDate() + 7);
  const autres = await Session.find({
    _id: { $ne: excludeId },
    formateur: session.formateur,
    start: { $gte: semaineDebut, $lt: finSemaine },
  });
  const heuresAutres = autres.reduce((sum, s) => sum + (s.end - s.start) / 3600000, 0);
  const heuresSession = (session.end - session.start) / 3600000;
  return heuresAutres + heuresSession <= plafond + 1e-6;
}

// Édition validée d'une session : refuse tout conflit et propose des alternatives.
export async function modifierSession(id, patch) {
  const session = await Session.findById(id);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);

  for (const champ of ['salle', 'formateur', 'groupe', 'module']) {
    if (patch[champ] !== undefined) session[champ] = patch[champ];
  }
  if (patch.start !== undefined) session.start = new Date(patch.start);
  if (patch.end !== undefined) session.end = new Date(patch.end);

  const candidate = {
    start: session.start,
    end: session.end,
    salle: session.salle,
    formateur: session.formateur,
    groupe: session.groupe,
  };

  const conflits = await trouverConflits(candidate, { excludeId: session._id });
  const plafondOk = await plafondFormateurRespecte(session, session._id);
  if (!plafondOk) conflits.push({ type: 'formateur_heures', message: MSG.FORMATEUR_HEURES_DEPASSEES });

  if (conflits.length) {
    const suggestions = await suggererCreneaux(candidate, { excludeId: session._id });
    throw new ApiError(409, MSG.CONFLIT_DETECTE, { conflits, suggestions });
  }

  await session.save();
  return Session.findById(session._id)
    .populate('formateur', 'nom prenom')
    .populate('groupe', 'nom code')
    .populate('salle', 'nom code')
    .populate('module', 'nom code');
}

// ---------------------------------------------------------------------------
// Liste des sessions
// ---------------------------------------------------------------------------

export async function listSessions(filter = {}) {
  const query = {};
  if (filter.formateur) query.formateur = filter.formateur;
  if (filter.groupe) query.groupe = filter.groupe;
  if (filter.status) query.status = filter.status;
  if (filter.from || filter.to) {
    query.start = {};
    if (filter.from) query.start.$gte = new Date(filter.from);
    if (filter.to) query.start.$lte = new Date(filter.to);
  }
  return Session.find(query)
    .sort({ start: 1 })
    .populate('formateur', 'nom prenom')
    .populate('groupe', 'nom code')
    .populate('salle', 'nom code')
    .populate('module', 'nom code');
}
