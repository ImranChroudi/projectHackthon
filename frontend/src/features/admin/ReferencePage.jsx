import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useGroupes, useSalles, useModules, useUsers, useAffectations } from '@/hooks/queries';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ReferencePage() {
  return (
    <div>
      <PageHeader title="Référentiel" description="Groupes, salles et modules du centre." />
      <Tabs defaultValue="groupes">
        <TabsList>
          <TabsTrigger value="groupes">Groupes</TabsTrigger>
          <TabsTrigger value="salles">Salles</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="affectations">Affectations</TabsTrigger>
        </TabsList>
        <TabsContent value="groupes"><GroupesTab /></TabsContent>
        <TabsContent value="salles"><SallesTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="affectations"><AffectationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useCrud(resource, queryKey) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (body) => api.post(`/${resource}`, body),
    onSuccess: () => { toast.success('Ajouté.'); qc.invalidateQueries({ queryKey: [queryKey] }); },
    onError: (err) => toast.error(apiError(err)),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/${resource}/${id}`),
    onSuccess: () => { toast.success('Supprimé.'); qc.invalidateQueries({ queryKey: [queryKey] }); },
    onError: (err) => toast.error(apiError(err)),
  });
  return { create, remove };
}

function ResourceCard({ children }) {
  return <Card className="mt-2"><CardContent className="p-0">{children}</CardContent></Card>;
}

function GroupesTab() {
  const { data: groupes = [], isLoading } = useGroupes();
  const { create, remove } = useCrud('groupes', 'groupes');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate({ nom, code }, { onSuccess: () => { setNom(''); setCode(''); } }); }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5"><Label>Nom</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
        </Button>
      </form>
      <ResourceCard>
        {!isLoading && groupes.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucun groupe" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Stagiaires</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {groupes.map((g) => (
                <TableRow key={g._id}>
                  <TableCell className="font-medium">{g.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{g.code}</TableCell>
                  <TableCell className="text-muted-foreground">{g.stagiaires?.length ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(g._id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ResourceCard>
    </div>
  );
}

function SallesTab() {
  const { data: salles = [], isLoading } = useSalles();
  const { create, remove } = useCrud('salles', 'salles');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [capacite, setCapacite] = useState('');

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate({ nom, code, capacite: capacite ? Number(capacite) : undefined }, { onSuccess: () => { setNom(''); setCode(''); setCapacite(''); } }); }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5"><Label>Nom</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Capacité</Label><Input type="number" value={capacite} onChange={(e) => setCapacite(e.target.value)} className="w-28" /></div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
        </Button>
      </form>
      <ResourceCard>
        {!isLoading && salles.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucune salle" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Capacité</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {salles.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{s.code}</TableCell>
                  <TableCell className="text-muted-foreground">{s.capacite}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(s._id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ResourceCard>
    </div>
  );
}

function AffectationsTab() {
  const { data: affectations = [], isLoading } = useAffectations();
  const { data: groupes = [] } = useGroupes();
  const { data: modules = [] } = useModules();
  const { data: formateurs = [] } = useUsers({ role: 'formateur' });
  const { create, remove } = useCrud('affectations', 'affectations');
  const [groupe, setGroupe] = useState('');
  const [module, setModule] = useState('');
  const [formateur, setFormateur] = useState('');
  const [heures, setHeures] = useState('5');

  const reset = () => { setGroupe(''); setModule(''); setFormateur(''); setHeures('5'); };

  // Charge hebdomadaire placée par formateur (somme des heures affectées).
  const chargeParFormateur = affectations.reduce((acc, a) => {
    const id = a.formateur?._id;
    if (id) acc[id] = (acc[id] || 0) + (a.heuresParSemaine || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Définissez ce qui doit être planifié : un module enseigné à un groupe par un formateur,
        à raison de X heures/semaine. La génération automatique de l'emploi du temps s'appuie dessus.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!groupe || !module || !formateur) { toast.error('Sélectionnez groupe, module et formateur.'); return; }
          create.mutate({ groupe, module, formateur, heuresParSemaine: Number(heures) || 5 }, { onSuccess: reset });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5">
          <Label>Groupe</Label>
          <Select value={groupe} onValueChange={setGroupe}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Groupe" /></SelectTrigger>
            <SelectContent>{groupes.map((g) => <SelectItem key={g._id} value={g._id}>{g.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Module</Label>
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>{modules.map((m) => <SelectItem key={m._id} value={m._id}>{m.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Formateur</Label>
          <Select value={formateur} onValueChange={setFormateur}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Formateur" /></SelectTrigger>
            <SelectContent>{formateurs.map((f) => <SelectItem key={f._id} value={f._id}>{f.prenom} {f.nom}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Heures / sem.</Label>
          <Input type="number" step="2.5" min="1" value={heures} onChange={(e) => setHeures(e.target.value)} className="w-28" />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
        </Button>
      </form>
      <ResourceCard>
        {!isLoading && affectations.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucune affectation" description="Ajoutez des affectations avant de générer l'emploi du temps." /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Groupe</TableHead><TableHead>Module</TableHead><TableHead>Formateur</TableHead><TableHead>Heures/sem.</TableHead><TableHead>Charge formateur</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {affectations.map((a) => {
                const charge = chargeParFormateur[a.formateur?._id] || 0;
                const plafond = a.formateur?.heuresHebdo || 25;
                return (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.groupe?.nom ?? '—'}</TableCell>
                    <TableCell>{a.module?.nom ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{a.formateur ? `${a.formateur.prenom} ${a.formateur.nom}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{a.heuresParSemaine} h</TableCell>
                    <TableCell className={charge > plafond ? 'text-destructive font-medium' : 'text-muted-foreground'}>{charge} / {plafond} h</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(a._id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ResourceCard>
    </div>
  );
}

function ModulesTab() {
  const { data: modules = [], isLoading } = useModules();
  const { data: formateurs = [] } = useUsers({ role: 'formateur' });
  const { create, remove } = useCrud('modules', 'modules');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [formateur, setFormateur] = useState('');

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate({ nom, code, formateur: formateur || undefined }, { onSuccess: () => { setNom(''); setCode(''); setFormateur(''); } }); }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1.5"><Label>Nom</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
        <div className="space-y-1.5">
          <Label>Formateur</Label>
          <Select value={formateur} onValueChange={setFormateur}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Optionnel…" /></SelectTrigger>
            <SelectContent>
              {formateurs.map((f) => (
                <SelectItem key={f._id} value={f._id}>{f.prenom} {f.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
        </Button>
      </form>
      <ResourceCard>
        {!isLoading && modules.length === 0 ? (
          <div className="p-6"><EmptyState title="Aucun module" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Code</TableHead><TableHead>Formateur</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {modules.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="font-medium">{m.nom}</TableCell>
                  <TableCell className="text-muted-foreground">{m.code}</TableCell>
                  <TableCell className="text-muted-foreground">{m.formateur ? `${m.formateur.prenom} ${m.formateur.nom}` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(m._id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ResourceCard>
    </div>
  );
}
