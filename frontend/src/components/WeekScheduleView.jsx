import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarRange, Loader2 } from 'lucide-react';
import { useSessions } from '@/hooks/queries';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JOURS_OUVRES, CRENEAUX } from '@/lib/constants';
import { formatTime, formatDate } from '@/lib/format';

// --- Helpers semaine ---
function mondayOf(date = new Date()) {
  const d = new Date(date);
  const jour = d.getDay(); // 0 dim … 1 lun
  d.setDate(d.getDate() + (jour === 0 ? -6 : 1 - jour));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
// Jour ouvré (lundi=0 … samedi=5) d'une date ; null si dimanche.
function jourOf(date) {
  const idx = new Date(date).getDay() - 1;
  return idx >= 0 && idx < JOURS_OUVRES.length ? JOURS_OUVRES[idx] : null;
}

// Emploi du temps hebdomadaire en lecture seule.
// `hide` masque la dimension implicite ('formateur' côté formateur, 'groupe' côté stagiaire).
export function WeekScheduleView({ title, description, hide }) {
  const [monday, setMonday] = useState(() => mondayOf());
  const to = useMemo(() => addDays(monday, 7), [monday]);

  const { data: sessions = [], isLoading } = useSessions({
    from: monday.toISOString(),
    to: to.toISOString(),
  });

  // Index { jour -> { creneauDebut -> session } }. Le périmètre est déjà filtré
  // par le backend (formateur → ses cours, stagiaire → son groupe).
  const grid = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const jour = jourOf(s.start);
      if (!jour) continue;
      (map[jour] ||= {})[formatTime(s.start)] = s;
    }
    return map;
  }, [sessions]);

  const samedi = addDays(monday, 5);
  const isThisWeek = monday.getTime() === mondayOf().getTime();

  return (
    <div>
      <PageHeader title={title} description={description} />

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            {formatDate(monday, 'dd MMM')} – {formatDate(samedi, 'dd MMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" title="Semaine précédente" onClick={() => setMonday((m) => addDays(m, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant={isThisWeek ? 'secondary' : 'outline'} size="sm" onClick={() => setMonday(mondayOf())}>
              Cette semaine
            </Button>
            <Button variant="outline" size="icon" title="Semaine suivante" onClick={() => setMonday((m) => addDays(m, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CalendarRange} title="Aucun cours cette semaine" description="Aucune session n'est planifiée sur cette période." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-24 border-b p-2 text-left font-medium text-muted-foreground">Créneau</th>
                    {JOURS_OUVRES.map((j) => (
                      <th key={j} className="border-b border-l p-2 text-left font-medium capitalize">{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CRENEAUX.map((c) => (
                    <tr key={c.debut}>
                      <td className="border-b p-2 align-top text-xs text-muted-foreground">{c.debut}<br />{c.fin}</td>
                      {JOURS_OUVRES.map((j) => {
                        const s = grid[j]?.[c.debut];
                        return (
                          <td key={j} className="border-b border-l p-1.5 align-top">
                            {s ? <ReadCell session={s} hide={hide} /> : <span className="text-xs text-muted-foreground/40">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReadCell({ session, hide }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-xs font-semibold leading-tight">{session.module?.nom}</div>
      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        {hide !== 'groupe' && <div>{session.groupe?.code}</div>}
        {hide !== 'formateur' && <div>{session.formateur?.prenom} {session.formateur?.nom}</div>}
        <Badge variant="secondary" className="mt-0.5">{session.salle?.code}</Badge>
      </div>
    </div>
  );
}
