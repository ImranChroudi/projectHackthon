import { useMemo, useState } from 'react';
import { Search, CalendarX2, Users } from 'lucide-react';
import { useFormateurAbsences } from '@/hooks/queries';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

const nomComplet = (s) => (s ? `${s.prenom} ${s.nom}` : '—');

export function AbsencesPage() {
  const { data: absences = [], isLoading } = useFormateurAbsences();
  const [q, setQ] = useState('');

  // Recherche : nom/prénom/email du stagiaire, module ou groupe.
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return absences;
    return absences.filter((a) => {
      const haystack = [
        a.stagiaire?.prenom,
        a.stagiaire?.nom,
        a.stagiaire?.email,
        a.module?.nom,
        a.module?.code,
        a.groupe?.nom,
        a.groupe?.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [absences, q]);

  // Comptage par stagiaire (sur le résultat filtré) : total + dont injustifiées.
  const parStagiaire = useMemo(() => {
    const map = new Map();
    for (const a of filtered) {
      const id = a.stagiaire?._id;
      if (!id) continue;
      const e = map.get(id) || { stagiaire: a.stagiaire, groupe: a.groupe, total: 0, injustifiees: 0 };
      e.total += 1;
      if (a.status === 'absent_injustifie') e.injustifiees += 1;
      map.set(id, e);
    }
    return [...map.values()].sort((x, y) => y.total - x.total);
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Absences"
        description="Les absences dans vos modules et groupes. Recherchez un stagiaire et suivez son cumul."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard icon={CalendarX2} label="Absences (résultat)" value={filtered.length} tone="warning" loading={isLoading} />
        <StatCard icon={Users} label="Stagiaires concernés" value={parStagiaire.length} tone="primary" loading={isLoading} />
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un stagiaire, un module ou un groupe…"
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="liste">
        <TabsList>
          <TabsTrigger value="liste">Liste des absences</TabsTrigger>
          <TabsTrigger value="stagiaires">Par stagiaire</TabsTrigger>
        </TabsList>

        {/* Liste détaillée */}
        <TabsContent value="liste">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Aucune absence"
                    description={q ? 'Aucun résultat pour cette recherche.' : 'Aucune absence enregistrée dans votre périmètre.'}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stagiaire</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Groupe</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell className="font-medium">{nomComplet(a.stagiaire)}</TableCell>
                        <TableCell className="text-muted-foreground">{a.module?.nom || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{a.groupe?.code || a.groupe?.nom || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(a.sessionStart)}</TableCell>
                        <TableCell><StatusBadge value={a.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cumul par stagiaire */}
        <TabsContent value="stagiaires">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4"><TableSkeleton /></div>
              ) : parStagiaire.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Aucun stagiaire"
                    description={q ? 'Aucun résultat pour cette recherche.' : 'Aucune absence enregistrée dans votre périmètre.'}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stagiaire</TableHead>
                      <TableHead>Groupe</TableHead>
                      <TableHead className="text-right">Total absences</TableHead>
                      <TableHead className="text-right">Dont injustifiées</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parStagiaire.map((e) => (
                      <TableRow key={e.stagiaire._id}>
                        <TableCell className="font-medium">{nomComplet(e.stagiaire)}</TableCell>
                        <TableCell className="text-muted-foreground">{e.groupe?.code || e.groupe?.nom || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{e.total}</TableCell>
                        <TableCell className="text-right">
                          {e.injustifiees > 0 ? (
                            <Badge variant="destructive">{e.injustifiees}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
