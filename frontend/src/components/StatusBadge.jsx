import { Badge } from '@/components/ui/badge';
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_VARIANTS,
  JUSTIF_LABELS,
  JUSTIF_VARIANTS,
  SESSION_LABELS,
  SESSION_VARIANTS,
} from '@/lib/constants';

const MAPS = {
  attendance: { labels: ATTENDANCE_LABELS, variants: ATTENDANCE_VARIANTS },
  justification: { labels: JUSTIF_LABELS, variants: JUSTIF_VARIANTS },
  session: { labels: SESSION_LABELS, variants: SESSION_VARIANTS },
};

// Badge coloré pour un statut (présence / justification / session).
export function StatusBadge({ type = 'attendance', value }) {
  const map = MAPS[type] || MAPS.attendance;
  return <Badge variant={map.variants[value] || 'muted'}>{map.labels[value] || value}</Badge>;
}
