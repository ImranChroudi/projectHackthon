import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

export function MyAttendancePage() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: () => api.get('/attendance/me').then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Mes présences" description="Historique de toutes vos séances." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : records.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Aucune séance" description="Votre historique est vide pour le moment." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Salle</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.module?.nom || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(a.sessionStart)}</TableCell>
                    <TableCell className="text-muted-foreground">{a.session?.salle?.nom || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge value={a.status} />
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
