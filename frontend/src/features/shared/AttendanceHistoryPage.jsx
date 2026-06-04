import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useAttendanceHistory, useGroupes, useModules, useUsers } from '@/hooks/queries';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ATTENDANCE_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

// Historique des présences — accessible au formateur (ses séances uniquement,
// cloisonné côté backend) et à l'admin (toutes les séances + filtre formateur).
export function AttendanceHistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [groupe, setGroupe] = useState('all');
  const [module, setModule] = useState('all');
  const [stagiaire, setStagiaire] = useState('');
  const [status, setStatus] = useState('all');
  const [formateur, setFormateur] = useState('all');

  // Filtres : on n'envoie que les valeurs actives (≠ 'all').
  const params = {};
  if (groupe !== 'all') params.groupe = groupe;
  if (module !== 'all') params.module = module;
  if (stagiaire.trim()) params.stagiaire = stagiaire.trim();
  if (status !== 'all') params.status = status;
  if (isAdmin && formateur !== 'all') params.formateur = formateur;

  const { data: records = [], isLoading } = useAttendanceHistory(params);
  const { data: groupes = [] } = useGroupes();
  const { data: modules = [] } = useModules();
  // La liste des utilisateurs est réservée à l'admin (route /users protégée) :
  // on ne déclenche la requête que pour l'admin, qui dispose du filtre formateur.
  const { data: formateurs = [] } = useQuery({
    queryKey: ['users', { role: 'formateur' }],
    queryFn: () => api.get('/users', { params: { role: 'formateur' } }).then((r) => r.data),
    enabled: isAdmin,
  });
  const { data: stagiaires = [] } = useUsers({ role: 'stagiaire' });

  const description = isAdmin
    ? 'Historique de toutes les présences enregistrées.'
    : 'Historique des présences de vos séances.';

  return (
    <div>
      <PageHeader title="Historique des présences" description={description} />

      {/* Filtres */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {isAdmin && (
          <div className="space-y-1.5">
            <Label>Formateur</Label>
            <Select value={formateur} onValueChange={setFormateur}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formateurs</SelectItem>
                {formateurs.map((f) => (
                  <SelectItem key={f._id} value={f._id}>
                    {f.prenom} {f.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Groupe</Label>
          <Select value={groupe} onValueChange={setGroupe}>
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les groupes</SelectItem>
              {groupes.map((g) => (
                <SelectItem key={g._id} value={g._id}>
                  {g.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Module</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m._id} value={m._id}>
                  {m.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Stagiaire</Label>
          <Input
            value={stagiaire}
            onChange={(event) => setStagiaire(event.target.value)}
            placeholder="Nom ou prénom"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(ATTENDANCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : records.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucune présence"
                description="Aucune fiche de présence ne correspond à ces filtres."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Stagiaire</TableHead>
                  <TableHead>Thème</TableHead>
                  <TableHead>Groupe</TableHead>
                  {isAdmin && <TableHead>Formateur</TableHead>}
                  <TableHead>Salle</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(a.sessionStart)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {a.stagiaire ? `${a.stagiaire.prenom} ${a.stagiaire.nom}` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.module?.nom || a.module?.code || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.groupe?.nom || '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-muted-foreground">
                        {a.formateur ? `${a.formateur.prenom} ${a.formateur.nom}` : '—'}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {a.session?.salle?.nom || '—'}
                    </TableCell>
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
