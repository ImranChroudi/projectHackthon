import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2, Pencil, Power } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useUsers, useGroupes } from '@/hooks/queries';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROLE_LABELS } from '@/lib/constants';

const EMPTY = { nom: '', prenom: '', email: '', password: '', role: 'stagiaire', groupe: '' };

export function UsersPage() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('stagiaire');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: users = [], isLoading } = useUsers({ role: roleFilter });
  const { data: groupes = [] } = useGroupes();

  const save = useMutation({
    mutationFn: (payload) => {
      const body = { ...payload };
      if (body.role !== 'stagiaire') delete body.groupe;
      if (!body.groupe) delete body.groupe;
      if (editing) {
        if (!body.password) delete body.password;
        return api.patch(`/users/${editing._id}`, body);
      }
      return api.post('/users', body);
    },
    onSuccess: () => {
      toast.success(editing ? 'Utilisateur mis à jour.' : 'Utilisateur créé.');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const toggleActive = useMutation({
    mutationFn: (u) => api.delete(`/users/${u._id}`),
    onSuccess: () => {
      toast.success('Compte désactivé.');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, role: roleFilter });
    setDialogOpen(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, password: '', role: u.role, groupe: u.groupe || '' });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader title="Utilisateurs" description="Gérez les comptes administrateurs, formateurs et stagiaires.">
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4" /> Nouvel utilisateur
        </Button>
      </PageHeader>

      <Tabs value={roleFilter} onValueChange={setRoleFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="stagiaire">Stagiaires</TabsTrigger>
          <TabsTrigger value="formateur">Formateurs</TabsTrigger>
          <TabsTrigger value="admin">Administrateurs</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : users.length === 0 ? (
            <div className="p-6"><EmptyState title="Aucun utilisateur" description="Créez le premier compte." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.prenom} {u.nom}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge></TableCell>
                    <TableCell>
                      {u.active ? <Badge variant="success">Actif</Badge> : <Badge variant="muted">Inactif</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.active && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => toggleActive.mutate(u)}>
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier' : 'Nouvel utilisateur'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe {editing && <span className="text-muted-foreground">(laisser vide pour conserver)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stagiaire">Stagiaire</SelectItem>
                    <SelectItem value="formateur">Formateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'stagiaire' && (
                <div className="space-y-1.5">
                  <Label>Groupe</Label>
                  <Select value={form.groupe || ''} onValueChange={(v) => setForm({ ...form, groupe: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                    <SelectContent>
                      {groupes.map((g) => (
                        <SelectItem key={g._id} value={g._id}>{g.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
