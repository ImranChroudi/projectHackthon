import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlayCircle, QrCode, Loader2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useSessions } from '@/hooks/queries';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatTime } from '@/lib/format';

export function SessionsPage() {
  const qc = useQueryClient();
  // Horloge légère : (ré)active les boutons dès qu'une session entre dans son créneau.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // On ne montre que les sessions du jour. Les bornes tombent sur minuit / fin de
  // journée locale : elles restent stables toute la journée (la clé de cache ne
  // change qu'au passage de minuit), même si `now` se rafraîchit chaque 30 s.
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const { data: sessions = [], isLoading } = useSessions({
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  });

  const activate = useMutation({
    mutationFn: (id) => api.post(`/sessions/${id}/activate`),
    onSuccess: () => {
      toast.success('Session activée. Le QR code est disponible.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div>
      <PageHeader title="Mes sessions du jour" description="Vos séances d'aujourd'hui — activez-en une pour générer son QR code." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune session aujourd'hui" description="Vous n'avez aucune séance planifiée pour la journée." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Groupe</TableHead>
                  <TableHead>Horaire</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  // Le formateur ne peut activer que pendant le créneau planifié [start, end].
                  const avant = now < new Date(s.start).getTime();
                  const dansCreneau = !avant && now <= new Date(s.end).getTime();
                  return (
                    <TableRow key={s._id}>
                      <TableCell className="font-medium">{s.module?.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{s.groupe?.nom}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTime(s.start)} → {formatTime(s.end)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="session" value={s.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === 'planifie' && (
                            <>
                              {avant && (
                                <span className="text-xs text-muted-foreground">
                                  Activable dès {formatTime(s.start)}
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => activate.mutate(s._id)}
                                disabled={activate.isPending || !dansCreneau}
                                title={dansCreneau ? undefined : `La session ne peut être activée que pendant son créneau (${formatDateTime(s.start)} – ${formatTime(s.end)}).`}
                              >
                                {activate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                Activer
                              </Button>
                            </>
                          )}
                          <Button asChild size="sm">
                            <Link to={`/formateur/sessions/${s._id}`}>
                              <QrCode className="h-4 w-4" /> Ouvrir
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
