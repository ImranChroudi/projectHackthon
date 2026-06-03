import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(date, pattern = 'dd MMM yyyy') {
  if (!date) return '—';
  return format(new Date(date), pattern, { locale: fr });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'HH:mm', { locale: fr });
}

export function fromNow(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

// Libellés français des jours (1 = dimanche … 7 = samedi, convention MongoDB $dayOfWeek).
export const JOURS_MONGO = {
  1: 'Dimanche',
  2: 'Lundi',
  3: 'Mardi',
  4: 'Mercredi',
  5: 'Jeudi',
  6: 'Vendredi',
  7: 'Samedi',
};
