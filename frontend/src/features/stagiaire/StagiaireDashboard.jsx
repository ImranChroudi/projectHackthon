import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ScanLine, CalendarX2, ShieldAlert, ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { formatDateTime } from '@/lib/format';

// Limite stricte (alignée sur le backend) pour la barre de progression.
const LIMITE = 10;

export function StagiaireDashboard() {
  const { user } = useAuth();
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: () => api.get('/attendance/me').then((r) => r.data),
  });

  const absences = user?.absenceCount ?? 0;
  const pct = Math.min(100, Math.round((absences / LIMITE) * 100));
  const tone = absences >= LIMITE ? 'destructive' : absences >= LIMITE * 0.8 ? 'warning' : 'success';
  const recent = attendance.slice(0, 5);

  return (
    <div>
      <PageHeader title={`Bonjour, ${user?.prenom} 👋`} description="Voici un aperçu de votre assiduité.">
        <Button asChild>
          <Link to="/stagiaire/scanner">
            <ScanLine className="h-4 w-4" /> Scanner ma présence
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={CalendarX2} label="Absences injustifiées" value={absences} tone={tone} />
        <StatCard icon={ClipboardList} label="Séances enregistrées" value={attendance.length} tone="primary" />
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Seuil d'absence</p>
              <ShieldAlert className={`h-5 w-5 text-${tone}`} />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {absences}<span className="text-base font-normal text-muted-foreground"> / {LIMITE}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  tone === 'destructive' ? 'bg-destructive' : tone === 'warning' ? 'bg-warning' : 'bg-success'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dernières séances</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState title="Aucune séance" description="Vos présences apparaîtront ici après votre premier scan." />
          ) : (
            <ul className="divide-y">
              {recent.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.module?.nom || 'Module'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(a.sessionStart)}</p>
                  </div>
                  <StatusBadge value={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
