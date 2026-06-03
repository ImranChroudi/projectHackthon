import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JOURS_MONGO } from '@/lib/format';

const BLUE = 'hsl(221 83% 53%)';
const GREEN = 'hsl(142 71% 36%)';
const AMBER = 'hsl(32 95% 44%)';

function useAnalytics(key, url) {
  return useQuery({ queryKey: ['analytics', key], queryFn: () => api.get(url).then((r) => r.data) });
}

export function AnalyticsPage() {
  const modules = useAnalytics('modules', '/analytics/modules');
  const timeslots = useAnalytics('timeslots', '/analytics/timeslots');
  const groupes = useAnalytics('groupes', '/analytics/groupes');
  const stagiaires = useAnalytics('stagiaires', '/analytics/stagiaires');

  const modulesData = (modules.data || []).map((m) => ({
    nom: m.module?.code || m.module?.nom || '—',
    taux: Math.round((m.taux || 0) * 100),
    absences: m.absences,
  }));

  const groupesData = (groupes.data || []).map((g) => ({
    nom: g.groupe?.code || g.groupe?.nom || '—',
    absences: g.absences,
  }));

  const timeslotsData = (timeslots.data || []).slice(0, 10).map((c) => ({
    nom: `${(JOURS_MONGO[c._id?.jour] || '').slice(0, 3)} ${c._id?.heure}h`,
    absences: c.absences,
  }));

  return (
    <div>
      <PageHeader title="Analyses" description="Statistiques d'absentéisme du centre." />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Taux d'absence par module" empty={modulesData.length === 0}>
          <BarChart data={modulesData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
            <XAxis type="number" unit="%" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
            <YAxis type="category" dataKey="nom" width={70} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="taux" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {modulesData.map((d, i) => (
                <Cell key={i} fill={d.taux >= 50 ? AMBER : BLUE} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Absences par groupe" empty={groupesData.length === 0}>
          <BarChart data={groupesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
            <XAxis dataKey="nom" tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
            <Tooltip />
            <Bar dataKey="absences" fill={BLUE} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Créneaux les plus touchés" empty={timeslotsData.length === 0}>
          <BarChart data={timeslotsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
            <XAxis dataKey="nom" tick={{ fontSize: 11 }} stroke="hsl(215 16% 47%)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(215 16% 47%)" />
            <Tooltip />
            <Bar dataKey="absences" fill={GREEN} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader><CardTitle>Stagiaires les plus absents</CardTitle></CardHeader>
          <CardContent className="p-0">
            {(stagiaires.data || []).length === 0 ? (
              <div className="p-6"><EmptyState title="Aucune donnée" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>#</TableHead><TableHead>Stagiaire</TableHead><TableHead className="text-right">Absences</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {(stagiaires.data || []).map((s, i) => (
                    <TableRow key={s._id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.prenom} {s.nom}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={s.absInjustifiees >= 10 ? 'destructive' : 'warning'}>{s.absInjustifiees}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, empty, children }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState title="Aucune donnée" description="Les statistiques apparaîtront avec les présences." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>{children}</ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
