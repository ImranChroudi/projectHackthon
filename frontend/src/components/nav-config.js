import {
  LayoutDashboard,
  Users,
  Library,
  CalendarRange,
  CalendarDays,
  FileCheck2,
  Megaphone,
  BarChart3,
  QrCode,
  ScanLine,
  ClipboardList,
  FileText,
  Bell,
} from 'lucide-react';

// Navigation par rôle : { to, label, icon }.
export const NAV = {
  admin: [
    { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { to: '/admin/referentiel', label: 'Référentiel', icon: Library },
    { to: '/admin/emploi-du-temps', label: 'Emploi du temps', icon: CalendarRange },
    { to: '/admin/justifications', label: 'Justifications', icon: FileCheck2 },
    { to: '/admin/annonces', label: 'Annonces', icon: Megaphone },
    { to: '/admin/analyses', label: 'Analyses', icon: BarChart3 },
  ],
  formateur: [
    { to: '/formateur', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/formateur/emploi-du-temps', label: 'Emploi du temps', icon: CalendarDays },
    { to: '/formateur/sessions', label: 'Mes sessions', icon: CalendarRange },
    { to: '/formateur/annonces', label: 'Annonces', icon: Megaphone },
  ],
  stagiaire: [
    { to: '/stagiaire', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/stagiaire/emploi-du-temps', label: 'Emploi du temps', icon: CalendarDays },
    { to: '/stagiaire/scanner', label: 'Scanner', icon: ScanLine },
    { to: '/stagiaire/presences', label: 'Mes présences', icon: ClipboardList },
    { to: '/stagiaire/justifications', label: 'Justifications', icon: FileText },
    { to: '/stagiaire/notifications', label: 'Notifications', icon: Bell },
    { to: '/stagiaire/annonces', label: 'Annonces', icon: Megaphone },
  ],
};

export const ICONS = { QrCode };
