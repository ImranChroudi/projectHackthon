import axios from 'axios';
import { toast } from 'sonner';

const TOKEN_KEY = 'attendance_token';
const DEVICE_KEY = 'attendance_device_id';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Identifiant stable de l'appareil (anti-fraude). Persisté hors du jeton pour
// survivre à une déconnexion : le backend l'utilise pour empêcher de scanner
// pour un ami en changeant de compte sur le même appareil.
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id =
      crypto?.randomUUID?.() ||
      `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export const api = axios.create({ baseURL: '/api' });

// Joint le jeton JWT et l'identifiant d'appareil à chaque requête.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-Id'] = getDeviceId();
  return config;
});

// Callback de déconnexion forcée, branché par AuthContext.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // 401 = session invalide -> déconnexion (sauf sur la page de login).
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      if (onUnauthorized) onUnauthorized();
    }
    // 423 = verrou anti-fraude : géré explicitement par l'appelant, pas de toast ici.
    if (message && status !== 401 && status !== 423) {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// Petit helper : extrait le message d'erreur français du backend.
export function apiError(error, fallback = 'Une erreur est survenue.') {
  return error?.response?.data?.message || fallback;
}
