import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BookOpen, Users, CalendarX2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JOURS_MONGO } from '@/lib/format';

export function FormateurDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'formateur'],
    queryFn: () => api.get('/analytics/formateur/me').then((r) => r.data),
  });

  const modules = data?.modules || [];
  const groupes = data?.groupes || [];
  const creneaux = data?.creneaux || [];

  const totalAbsences = modules.reduce((s, m) => s + (m.absences || 0), 0);

  const modulesChart = modules.map((m) => ({
    nom: m.module?.code || m.module?.nom || '—',
    absences: m.absences,
    taux: Math.round((m.taux || 0) * 100),
  }));

  const groupesChart = groupes.map((g) => ({
    nom: g.groupe?.code || g.groupe?.nom || '—',
    absences: g.absences || 0,
    injustifiees: g.absInjustifiees || 0,
  }));

  const creneauxChart = creneaux
    .slice(0, 8)
    .map((c) => ({ nom: `${JOURS_MONGO[c._id?.jour] || ''} ${c._id?.heure}h`, absences: c.absences }));

  return (
    <div>
      <PageHeader title="Tableau de bord" description="Analyses limitées à vos groupes et modules." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Modules suivis" value={modules.length} tone="primary" loading={isLoading} />
        <StatCard icon={Users} label="Groupes" value={groupes.length} tone="success" loading={isLoading} />
        <StatCard icon={CalendarX2} label="Total absences" value={totalAbsences} tone="warning" loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Absences par groupe</CardTitle>
          </CardHeader>
          <CardContent>
            {groupesChart.length === 0 ? (
              <EmptyState title="Aucune donnée" description="Les absences par groupe apparaîtront avec les présences." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={groupesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="nom" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Legend />
                  <Bar name="Total absences" dataKey="absences" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  <Bar name="Dont injustifiées" dataKey="injustifiees" fill="hsl(0 72% 51%)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Absences par module</CardTitle>
          </CardHeader>
          <CardContent>
            {modulesChart.length === 0 ? (
              <EmptyState title="Aucune donnée" description="Les statistiques apparaîtront avec les présences." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={modulesChart}>
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
          <CardHeader>
            <CardTitle>Créneaux les plus touchés</CardTitle>
          </CardHeader>
          <CardContent>
            {creneauxChart.length === 0 ? (
              <EmptyState title="Aucune donnée" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={creneauxChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="nom" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
                  <Tooltip />
                  <Bar dataKey="absences" fill="hsl(142 71% 36%)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
