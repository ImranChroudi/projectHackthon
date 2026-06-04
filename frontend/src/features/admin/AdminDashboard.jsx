import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, FileClock, CalendarX2, GraduationCap, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AdminDashboard() {
  const stagiaires = useQuery({
    queryKey: ['users', { role: 'stagiaire' }],
    queryFn: () => api.get('/users', { params: { role: 'stagiaire' } }).then((r) => r.data),
  });
  const justifs = useQuery({
    queryKey: ['justifications', 'en_attente'],
    queryFn: () => api.get('/justifications', { params: { statut: 'en_attente' } }).then((r) => r.data),
  });
  const groupes = useQuery({
    queryKey: ['analytics', 'groupes'],
    queryFn: () => api.get('/analytics/groupes').then((r) => r.data),
  });
  const topStagiaires = useQuery({
    queryKey: ['analytics', 'stagiaires'],
    queryFn: () => api.get('/analytics/stagiaires', { params: { limit: 5 } }).then((r) => r.data),
  });
  const todayAbsents = useQuery({
    queryKey: ['analytics', 'today', 'stagiaires-absents'],
    queryFn: () => api.get('/analytics/today/stagiaires-absents').then((r) => r.data),
  });
  const todayGroupeMax = useQuery({
    queryKey: ['analytics', 'today', 'groupe-max-absences'],
    queryFn: () => api.get('/analytics/today/groupe-max-absences').then((r) => r.data),
  });

  const totalAbsences = (stagiaires.data || []).reduce((s, u) => s + (u.absenceCount || 0), 0);

  const groupesChart = (groupes.data || []).slice(0, 6).map((g) => ({
    nom: g.groupe?.code || g.groupe?.nom || '—',
    absences: g.absences,
  }));

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble du centre de formation." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Stagiaires" value={stagiaires.data?.length ?? 0} tone="primary" loading={stagiaires.isLoading} />
        <StatCard icon={CalendarX2} label="Absences cumulées" value={totalAbsences} tone="warning" loading={stagiaires.isLoading} />
        <StatCard icon={FileClock} label="Justifications en attente" value={justifs.data?.length ?? 0} tone="destructive" loading={justifs.isLoading} />
        <StatCard icon={Users} label="Groupes suivis" value={groupes.data?.length ?? 0} tone="success" loading={groupes.isLoading} />
        <StatCard icon={CalendarX2} label="Absents aujourd'hui" value={todayAbsents.data?.absents ?? 0} tone="warning" loading={todayAbsents.isLoading} />
        <StatCard icon={Users} label="Groupe max absences" value={todayGroupeMax.data?.nom ? `${todayGroupeMax.data.nom} (${todayGroupeMax.data.absences})` : '—'} tone="muted" loading={todayGroupeMax.isLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Absences par groupe</CardTitle>
          </CardHeader>
          <CardContent>
            {groupesChart.length === 0 ? (
              <EmptyState title="Aucune donnée" description="Les statistiques s'afficheront avec les présences." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={groupesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="nom" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Bar dataKey="absences" fill="hsl(221 83% 53%)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top absences</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/analyses">
                Voir tout <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(topStagiaires.data || []).length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <ul className="space-y-3">
                {(topStagiaires.data || []).map((s, i) => (
                  <li key={s._id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {s.prenom} {s.nom}
                    </span>
                    <span className="text-sm font-semibold text-destructive">{s.absInjustifiees}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
