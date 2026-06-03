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
  const { data: allSessions = [], isLoading } = useSessions();
  // On masque les sessions déjà terminées (fin passée) — seules les sessions
  // en cours ou à venir restent activables.
  const sessions = allSessions.filter((s) => !s.end || new Date(s.end).getTime() >= Date.now());

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
      <PageHeader title="Mes sessions" description="Activez une session pour générer son QR code." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune session à venir" description="Aucune session en cours ou planifiée pour le moment." />
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
                {sessions.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">{s.module?.nom}</TableCell>
                    <TableCell className="text-muted-foreground">{s.groupe?.nom}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.start)} → {formatTime(s.end)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="session" value={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {s.status === 'planifie' && (
                          <Button size="sm" variant="outline" onClick={() => activate.mutate(s._id)} disabled={activate.isPending}>
                            {activate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                            Activer
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link to={`/formateur/sessions/${s._id}`}>
                            <QrCode className="h-4 w-4" /> Ouvrir
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
