import { User } from '../models/User.js';
import { Groupe } from '../models/Groupe.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { ROLES } from '../config/constants.js';

export async function createUser(data) {
  const { password, ...rest } = data;
  const user = new User(rest);
  await user.setPassword(password);
  await user.save();

  // Maintien de la cohérence groupe <-> stagiaire.
  if (user.role === ROLES.STAGIAIRE && user.groupe) {
    await Groupe.findByIdAndUpdate(user.groupe, { $addToSet: { stagiaires: user._id } });
  }
  return user.toSafeJSON();
}

export async function listUsers(filter = {}) {
  const query = {};
  if (filter.role) query.role = filter.role;
  if (filter.groupe) query.groupe = filter.groupe;
  const users = await User.find(query).sort({ nom: 1, prenom: 1 });
  return users.map((u) => u.toSafeJSON());
}

export async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, MSG.UTILISATEUR_INTROUVABLE);
  return user.toSafeJSON();
}

export async function updateUser(id, data) {
  const { password, ...rest } = data;
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, MSG.UTILISATEUR_INTROUVABLE);

  const ancienGroupe = user.groupe ? user.groupe.toString() : null;
  Object.assign(user, rest);
  if (password) await user.setPassword(password);
  await user.save();

  // Resynchronisation du groupe si modifié.
  if (user.role === ROLES.STAGIAIRE && rest.groupe && rest.groupe !== ancienGroupe) {
    if (ancienGroupe) {
      await Groupe.findByIdAndUpdate(ancienGroupe, { $pull: { stagiaires: user._id } });
    }
    await Groupe.findByIdAndUpdate(user.groupe, { $addToSet: { stagiaires: user._id } });
  }
  return user.toSafeJSON();
}

export async function deactivateUser(id) {
  const user = await User.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!user) throw new ApiError(404, MSG.UTILISATEUR_INTROUVABLE);
  return user.toSafeJSON();
}

// Création en masse (import de stagiaires / formateurs).
export async function bulkCreate(users = []) {
  const created = [];
  for (const data of users) {
    created.push(await createUser(data));
  }
  return created;
}
