// Rôles du système
export const ROLES = {
  ADMIN: 'admin',
  FORMATEUR: 'formateur',
  STAGIAIRE: 'stagiaire',
};

// Statuts d'une session
export const SESSION_STATUS = {
  PLANIFIE: 'planifie',
  ACTIVE: 'active',
  TERMINE: 'termine',
};

// Statuts de présence
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  RETARD: 'retard',
  ABSENT_INJUSTIFIE: 'absent_injustifie',
  ABSENT_JUSTIFIE: 'absent_justifie',
  JUSTIFICATION_EN_ATTENTE: 'justification_en_attente',
};

// Statuts d'une justification
export const JUSTIFICATION_STATUS = {
  EN_ATTENTE: 'en_attente',
  APPROUVE: 'approuve',
  REFUSE: 'refuse',
};

// Types de notification
export const NOTIFICATION_TYPE = {
  SEUIL_PROCHE: 'seuil_proche',
  LIMITE_ATTEINTE: 'limite_atteinte',
  JUSTIF_STATUT: 'justif_statut',
  INFO: 'info',
};

// Audiences d'une annonce
export const POST_AUDIENCE = {
  FORMATEURS: 'formateurs',
  STAGIAIRES: 'stagiaires',
  TOUS: 'tous',
};

// Jours de la semaine (emploi du temps)
export const JOURS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

// Jours ouvrés du centre (lundi → samedi)
export const JOURS_OUVRES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Créneaux horaires : quatre blocs de 2 h 30
export const CRENEAUX = [
  { debut: '08:30', fin: '11:00' },
  { debut: '11:00', fin: '13:30' },
  { debut: '13:30', fin: '16:00' },
  { debut: '16:00', fin: '18:30' },
];

// Durée d'un bloc (heures) et plafond hebdomadaire d'un formateur
export const BLOC_HEURES = 2.5;
export const FORMATEUR_HEURES_HEBDO = 25;
