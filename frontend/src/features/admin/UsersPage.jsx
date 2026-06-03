import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2, Pencil, Power, Upload } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useUsers, useGroupes, useModules } from '@/hooks/queries';
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
  const fileInputRef = useRef(null);
  const [roleFilter, setRoleFilter] = useState('stagiaire');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const findById = (list, id) => list.find((item) => item._id === id);
  const labelsOf = (list, ids, fmt) =>
    (ids || []).map((id) => {
      const entry = findById(list, id);
      return entry ? fmt(entry) : id;
    }).filter(Boolean).join(', ');

  const { data: users = [], isLoading } = useUsers({
    role: roleFilter,
    groupe: groupFilter === 'all' ? undefined : groupFilter || undefined,
    module: roleFilter === 'formateur' ? (moduleFilter === 'all' ? undefined : moduleFilter || undefined) : undefined,
    active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    search: search || undefined,
  });
  const { data: groupes = [] } = useGroupes();
  const { data: modules = [] } = useModules();

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

  const importUsers = useMutation({
    mutationFn: (payload) => api.post(`/users/import?role=${roleFilter}`, payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`${data.length} ${roleFilter === 'formateur' ? 'formateur(s)' : 'stagiaire(s)'} importé(s).`);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(apiError(err, 'Import CSV impossible.')),
    onSettled: () => setImporting(false),
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

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    event.target.value = '';

    const formData = new FormData();
    formData.append('file', file);
    importUsers.mutate(formData);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCsvFile}
      />
      <PageHeader title="Utilisateurs" description="Gérez les comptes administrateurs, formateurs et stagiaires.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Nouvel utilisateur
          </Button>
          {roleFilter !== 'admin' && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing || importUsers.isPending}
            >
              <Upload className="h-4 w-4" /> Importer CSV
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs value={roleFilter} onValueChange={(value) => {
        setRoleFilter(value);
        setGroupFilter('');
        setModuleFilter('');
        setSearch('');
        setActiveFilter('all');
      }} className="mb-4">
        <TabsList>
          <TabsTrigger value="stagiaire">Stagiaires</TabsTrigger>
          <TabsTrigger value="formateur">Formateurs</TabsTrigger>
          <TabsTrigger value="admin">Administrateurs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 lg:grid-cols-4 mb-4">
        <div className="space-y-1.5">
          <Label>Recherche</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, prénom ou email"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Groupe</Label>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {groupes.map((g) => (
                <SelectItem key={g._id} value={g._id}>{g.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {roleFilter === 'formateur' && (
          <div className="space-y-1.5">
            <Label>Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m._id} value={m._id}>{m.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>État</Label>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                  {roleFilter === 'formateur' && <TableHead>Modules</TableHead>}
                  {roleFilter === 'formateur' && <TableHead>Groupes</TableHead>}
                  {roleFilter === 'stagiaire' && <TableHead>Groupe</TableHead>}
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
                    {roleFilter === 'formateur' && (
                      <TableCell className="text-muted-foreground">
                        {labelsOf(modules, u.modulesAssigned, (m) => m.nom) || '—'}
                      </TableCell>
                    )}
                    {roleFilter === 'formateur' && (
                      <TableCell className="text-muted-foreground">
                        {labelsOf(groupes, u.groupesAssigned, (g) => g.nom) || '—'}
                      </TableCell>
                    )}
                    {roleFilter === 'stagiaire' && (
                      <TableCell className="text-muted-foreground">
                        {findById(groupes, u.groupe)?.nom || '—'}
                      </TableCell>
                    )}
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
