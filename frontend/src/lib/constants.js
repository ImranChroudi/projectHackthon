// Libellés et variantes de couleur des statuts (français).

export const ATTENDANCE_LABELS = {
  present: 'Présent',
  retard: 'En retard',
  absent_injustifie: 'Absent (injustifié)',
  absent_justifie: 'Absent (justifié)',
  justification_en_attente: 'Justification en attente',
};

// Variante de Badge associée à chaque statut.
export const ATTENDANCE_VARIANTS = {
  present: 'success',
  retard: 'warning',
  absent_injustifie: 'destructive',
  absent_justifie: 'info',
  justification_en_attente: 'warning',
};

export const JUSTIF_LABELS = {
  en_attente: 'En attente',
  approuve: 'Approuvée',
  refuse: 'Refusée',
};

export const JUSTIF_VARIANTS = {
  en_attente: 'warning',
  approuve: 'success',
  refuse: 'destructive',
};

export const SESSION_LABELS = {
  planifie: 'Planifiée',
  active: 'Active',
  termine: 'Terminée',
};

export const SESSION_VARIANTS = {
  planifie: 'secondary',
  active: 'success',
  termine: 'muted',
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  formateur: 'Formateur',
  stagiaire: 'Stagiaire',
};

export const AUDIENCE_LABELS = {
  tous: 'Tout le monde',
  formateurs: 'Formateurs',
  stagiaires: 'Stagiaires',
};

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Grille de l'emploi du temps (doit refléter le backend : config/constants.js)
export const JOURS_OUVRES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const CRENEAUX = [
  { debut: '08:30', fin: '11:00' },
  { debut: '11:00', fin: '13:30' },
  { debut: '13:30', fin: '16:00' },
  { debut: '16:00', fin: '18:30' },
];

export const CONFLIT_LABELS = {
  salle: 'Salle déjà occupée',
  formateur: 'Formateur déjà occupé',
  groupe: 'Groupe déjà occupé',
  formateur_heures: 'Plafond horaire du formateur dépassé',
};
