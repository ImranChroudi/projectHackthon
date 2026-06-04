// Messages destinés à l'utilisateur, en français.
export const MSG = {
  // Auth
  IDENTIFIANTS_INVALIDES: 'Email ou mot de passe incorrect.',
  NON_AUTHENTIFIE: 'Authentification requise.',
  TOKEN_INVALIDE: 'Jeton invalide ou expiré.',
  ACCES_REFUSE: "Vous n'avez pas l'autorisation d'accéder à cette ressource.",
  COMPTE_DESACTIVE: 'Ce compte est désactivé.',
  // Verrou anti-fraude (15 min après un scan). Le décompte est passé en argument
  // pour afficher les minutes réellement restantes jusqu'à la levée automatique.
  DECONNEXION_VERROUILLEE: (minutes) =>
    `Déconnexion bloquée pendant 15 minutes après un scan de présence (anti-fraude). Encore ${minutes} min avant de pouvoir vous déconnecter.`,
  CONNEXION_VERROUILLEE: (minutes) =>
    `Connexion impossible : un scan de présence est actif sur cet appareil (anti-fraude). Réessayez dans ${minutes} min.`,
  DECONNEXION_OK: 'Déconnexion réussie.',

  // Ressources
  RESSOURCE_INTROUVABLE: 'Ressource introuvable.',
  UTILISATEUR_INTROUVABLE: 'Utilisateur introuvable.',
  EMAIL_DEJA_UTILISE: 'Cet email est déjà utilisé.',

  // Sessions / QR
  SESSION_INTROUVABLE: 'Session introuvable.',
  SESSION_NON_ACTIVE: "La session n'est pas active.",
  SESSION_HORS_CRENEAU: "La session ne peut être activée qu'entre son heure de début et de fin.",
  QR_EXPIRE: 'Le code QR a expiré (fenêtre de 15 minutes dépassée).',
  QR_INVALIDE: 'Code QR invalide ou périmé.',

  // Scan / présence
  WIFI_REQUIS:
    'Vous devez être connecté au réseau WiFi du centre pour scanner le code QR.',
  PAS_DANS_GROUPE: "Vous n'appartenez pas au groupe de cette session.",
  DEJA_PRESENT: 'Votre présence a déjà été enregistrée pour cette session.',
  PRESENCE_ENREGISTREE: 'Présence enregistrée avec succès.',
  PRESENCE_MISE_A_JOUR: 'Présence mise à jour.',

  // Justifications
  JUSTIF_INTROUVABLE: 'Justification introuvable.',
  JUSTIF_NON_ABSENT:
    'Une justification ne peut être soumise que pour une absence injustifiée.',
  JUSTIF_SOUMISE: 'Justification soumise. En attente de validation.',
  JUSTIF_TRAITEE: 'Cette justification a déjà été traitée.',
  JUSTIF_APPROUVEE: 'Justification approuvée.',
  JUSTIF_REFUSEE: 'Justification refusée.',

  // Emploi du temps
  CONFLIT_SALLE: 'La salle est déjà occupée sur ce créneau.',
  CONFLIT_FORMATEUR: 'Le formateur a déjà une session sur ce créneau.',
  CONFLIT_GROUPE: 'Le groupe a déjà une session sur ce créneau.',
  CONFLIT_DETECTE: 'Déplacement impossible : conflit détecté.',
  FORMATEUR_HEURES_DEPASSEES:
    'Ce déplacement dépasse le plafond horaire hebdomadaire du formateur.',
  AFFECTATION_INTROUVABLE: 'Affectation introuvable.',
  AUCUNE_AFFECTATION:
    'Aucune affectation à planifier. Créez des affectations (groupe / module / formateur) au préalable.',

  // Validation
  VALIDATION_ECHEC: 'Les données envoyées sont invalides.',

  // Générique
  ERREUR_SERVEUR: 'Une erreur interne est survenue.',
};
