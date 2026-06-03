import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// --- Référence (groupes / salles / modules) ---
export function useGroupes() {
  return useQuery({ queryKey: ['groupes'], queryFn: () => api.get('/groupes').then((r) => r.data) });
}
export function useSalles() {
  return useQuery({ queryKey: ['salles'], queryFn: () => api.get('/salles').then((r) => r.data) });
}
export function useModules() {
  return useQuery({ queryKey: ['modules'], queryFn: () => api.get('/modules').then((r) => r.data) });
}

// --- Affectations (groupe / module / formateur / heures) ---
export function useAffectations(params = {}) {
  const { groupe, module, formateur } = params;
  return useQuery({
    queryKey: ['affectations', groupe || 'all', module || 'all', formateur || 'all'],
    queryFn: () => api.get('/affectations', { params }).then((r) => r.data),
  });
}

// --- Utilisateurs ---
export function useUsers(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get('/users', { params }).then((r) => r.data),
  });
}

// --- Sessions ---
export function useSessions(params = {}) {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => api.get('/sessions', { params }).then((r) => r.data),
  });
}

// Génération automatique de l'emploi du temps.
export function useAutoGenerate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (semaineDebut) =>
      api.post('/schedule/auto-generate', semaineDebut ? { semaineDebut } : {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

// Modification validée d'une session (renvoie 409 + suggestions en cas de conflit).
export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/sessions/${id}`, patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

// --- Notifications (avec rafraîchissement périodique pour la cloche) ---
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// --- Annonces ---
export function usePosts() {
  return useQuery({ queryKey: ['posts'], queryFn: () => api.get('/posts').then((r) => r.data) });
}

// --- Absences scopées au formateur connecté (ses modules / groupes) ---
export function useFormateurAbsences() {
  return useQuery({
    queryKey: ['analytics', 'formateur', 'absences'],
    queryFn: () => api.get('/analytics/formateur/absences').then((r) => r.data),
  });
}
