import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, CalendarCheck, Zap, Wand2, AlertTriangle, Pencil } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  useGroupes,
  useSalles,
  useModules,
  useUsers,
  useSessions,
  useAutoGenerate,
  useUpdateSession,
} from '@/hooks/queries';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { JOURS, JOURS_OUVRES, CRENEAUX, CONFLIT_LABELS } from '@/lib/constants';
import { formatTime } from '@/lib/format';

// --- Helpers semaine ---
function mondayOf(input) {
  const d = input ? new Date(input + 'T00:00:00') : new Date();
  const jour = d.getDay(); // 0 dim … 1 lun
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function slotDate(monday, jour, hhmm) {
  const d = new Date(monday);
  d.setDate(d.getDate() + JOURS_OUVRES.indexOf(jour));
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
// Jour ouvré (lundi=0 … samedi=5) d'une date ; null si dimanche.
function jourOf(date) {
  const idx = new Date(date).getDay() - 1;
  return idx >= 0 && idx < JOURS_OUVRES.length ? JOURS_OUVRES[idx] : null;
}

export function SchedulePage() {
  return (
    <div>
      <PageHeader title="Emploi du temps" description="Génération automatique à partir des affectations, ou saisie manuelle." />
      <Tabs defaultValue="auto">
        <TabsList>
          <TabsTrigger value="auto">Génération automatique</TabsTrigger>
          <TabsTrigger value="manuel">Saisie manuelle</TabsTrigger>
        </TabsList>
        <TabsContent value="auto"><AutoTab /></TabsContent>
        <TabsContent value="manuel"><ManualTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===========================================================================
// Onglet : génération automatique + grille hebdomadaire éditable
// ===========================================================================

function AutoTab() {
  const [semaineInput, setSemaineInput] = useState(toDateInput(mondayOf()));
  const monday = useMemo(() => mondayOf(semaineInput), [semaineInput]);
  const to = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    return d;
  }, [monday]);

  const { data: sessions = [], isLoading } = useSessions({
    from: monday.toISOString(),
    to: to.toISOString(),
  });
  const { data: groupes = [] } = useGroupes();
  const { data: salles = [] } = useSalles();
  const { data: formateurs = [] } = useUsers({ role: 'formateur' });
  const auto = useAutoGenerate();
  const [editing, setEditing] = useState(null);

  // Axe d'affichage : un emploi du temps lisible = une entité à la fois.
  const [viewBy, setViewBy] = useState('groupe');
  const [entityId, setEntityId] = useState('');

  const VIEWS = useMemo(() => ({
    groupe: { label: 'Groupe', list: groupes, getLabel: (e) => e.nom, ofSession: (s) => s.groupe?._id },
    formateur: { label: 'Formateur', list: formateurs, getLabel: (e) => `${e.prenom} ${e.nom}`, ofSession: (s) => s.formateur?._id },
    salle: { label: 'Salle', list: salles, getLabel: (e) => e.nom, ofSession: (s) => s.salle?._id },
  }), [groupes, formateurs, salles]);
  const view = VIEWS[viewBy];

  // Sélectionne la première entité valide quand l'axe (ou sa liste) change.
  useEffect(() => {
    const ids = view.list.map((e) => e._id);
    if (!ids.includes(entityId)) setEntityId(ids[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBy, view.list]);

  // Nombre de sessions par entité (badge informatif dans le sélecteur).
  const countByEntity = useMemo(() => {
    const m = {};
    for (const s of sessions) {
      const id = view.ofSession(s);
      if (id) m[id] = (m[id] || 0) + 1;
    }
    return m;
  }, [sessions, view]);

  const sessionsFiltrees = useMemo(
    () => sessions.filter((s) => view.ofSession(s) === entityId),
    [sessions, view, entityId]
  );

  const run = () =>
    auto.mutate(monday.toISOString(), {
      onSuccess: (data) => {
        toast.success(`${data.count} session(s) générée(s).`);
        if (data.nonPlanifies?.length) {
          toast.warning(`${data.nonPlanifies.length} cours non planifié(s) — voir le détail.`);
        }
      },
      onError: (err) => toast.error(apiError(err, 'Génération impossible.')),
    });

  // Index { jour -> { creneauDebut -> session } } pour l'entité sélectionnée.
  const grid = useMemo(() => {
    const map = {};
    for (const s of sessionsFiltrees) {
      const jour = jourOf(s.start);
      if (!jour) continue;
      const heure = formatTime(s.start);
      (map[jour] ||= {})[heure] = s;
    }
    return map;
  }, [sessionsFiltrees]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Générer la semaine</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Lundi de la semaine</Label>
              <Input type="date" value={semaineInput} onChange={(e) => setSemaineInput(e.target.value)} className="w-52" />
            </div>
            <Button onClick={run} disabled={auto.isPending}>
              {auto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Générer automatiquement
            </Button>
            <p className="text-sm text-muted-foreground">
              Respecte les salles, les groupes et le plafond de 25 h/formateur. Remplace les sessions planifiées de la semaine.
            </p>
          </div>

          {auto.data?.nonPlanifies?.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
                <AlertTriangle className="h-4 w-4" /> {auto.data.nonPlanifies.length} cours non planifié(s)
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {auto.data.nonPlanifies.map((n, i) => (
                  <li key={i}>• {n.groupe} — {n.module} ({n.formateur})</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-stretch gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Grille de la semaine</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              {Object.entries(VIEWS).map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewBy(key)}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    viewBy === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="w-60"><SelectValue placeholder={`Choisir : ${view.label.toLowerCase()}`} /></SelectTrigger>
              <SelectContent>
                {view.list.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {view.getLabel(e)} {countByEntity[e._id] ? `(${countByEntity[e._id]})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-6"><EmptyState title="Aucune session" description="Lancez la génération automatique pour cette semaine." /></div>
          ) : sessionsFiltrees.length === 0 ? (
            <div className="p-6"><EmptyState title="Aucune session" description="Cette sélection n'a aucun cours planifié cette semaine." /></div>
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
                            {s ? <SessionCell session={s} viewBy={viewBy} onEdit={() => setEditing(s)} /> : <span className="text-xs text-muted-foreground/40">—</span>}
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

      {editing && <EditSessionDialog session={editing} monday={monday} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SessionCell({ session, viewBy, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group w-full rounded-md border bg-card p-2 text-left transition hover:border-primary hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold leading-tight">{session.module?.nom}</span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        {/* On masque la dimension qui sert déjà d'axe d'affichage. */}
        {viewBy !== 'groupe' && <div>{session.groupe?.code}</div>}
        {viewBy !== 'formateur' && <div>{session.formateur?.prenom} {session.formateur?.nom}</div>}
        {viewBy !== 'salle' && <Badge variant="secondary" className="mt-0.5">{session.salle?.code}</Badge>}
      </div>
    </button>
  );
}

function EditSessionDialog({ session, monday, onClose }) {
  const { data: salles = [] } = useSalles();
  const { data: formateurs = [] } = useUsers({ role: 'formateur' });
  const update = useUpdateSession();

  const initialJour = jourOf(session.start) || JOURS_OUVRES[0];
  const initialCreneau = CRENEAUX.find((c) => c.debut === formatTime(session.start)) || CRENEAUX[0];

  const [jour, setJour] = useState(initialJour);
  const [creneau, setCreneau] = useState(initialCreneau.debut);
  const [salle, setSalle] = useState(session.salle?._id || '');
  const [formateur, setFormateur] = useState(session.formateur?._id || '');
  const [conflits, setConflits] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const submitPatch = (patch) => {
    setConflits([]);
    update.mutate(
      { id: session._id, patch },
      {
        onSuccess: () => { toast.success('Session déplacée.'); onClose(); },
        onError: (err) => {
          const details = err.response?.data?.details;
          if (err.response?.status === 409 && details) {
            setConflits(details.conflits || []);
            setSuggestions(details.suggestions || []);
          } else {
            toast.error(apiError(err));
          }
        },
      }
    );
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const c = CRENEAUX.find((x) => x.debut === creneau);
    submitPatch({
      start: slotDate(monday, jour, c.debut).toISOString(),
      end: slotDate(monday, jour, c.fin).toISOString(),
      salle,
      formateur,
    });
  };

  const applySuggestion = (sug) => {
    setJour(sug.jour);
    setCreneau(sug.creneau.debut);
    setSalle(sug.salle._id);
    submitPatch({ start: sug.start, end: sug.end, salle: sug.salle._id, formateur });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déplacer la session</DialogTitle>
          <DialogDescription>{session.module?.nom} · {session.groupe?.nom}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jour</Label>
              <Select value={jour} onValueChange={setJour}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOURS_OUVRES.map((j) => <SelectItem key={j} value={j} className="capitalize">{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Créneau</Label>
              <Select value={creneau} onValueChange={setCreneau}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CRENEAUX.map((c) => <SelectItem key={c.debut} value={c.debut}>{c.debut}–{c.fin}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Salle</Label>
              <Select value={salle} onValueChange={setSalle}>
                <SelectTrigger><SelectValue placeholder="Salle" /></SelectTrigger>
                <SelectContent>{salles.map((s) => <SelectItem key={s._id} value={s._id}>{s.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formateur</Label>
              <Select value={formateur} onValueChange={setFormateur}>
                <SelectTrigger><SelectValue placeholder="Formateur" /></SelectTrigger>
                <SelectContent>{formateurs.map((f) => <SelectItem key={f._id} value={f._id}>{f.prenom} {f.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {conflits.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> Déplacement impossible
              </div>
              <ul className="text-sm text-destructive/90">
                {conflits.map((c, i) => <li key={i}>• {CONFLIT_LABELS[c.type] || c.message}</li>)}
              </ul>
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Créneaux libres suggérés :</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applySuggestion(sug)}
                        className="rounded-full border bg-card px-3 py-1 text-xs transition hover:border-primary hover:bg-primary/5"
                      >
                        <span className="capitalize">{sug.jour}</span> {sug.creneau.debut} · {sug.salle.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />} Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Onglet : saisie manuelle (modèle d'emploi du temps) — conservé
// ===========================================================================

const EMPTY_ROW = { jour: 'lundi', heureDebut: '08:30', heureFin: '11:00', formateur: '', groupe: '', salle: '', module: '' };

function ManualTab() {
  const { data: groupes = [] } = useGroupes();
  const { data: salles = [] } = useSalles();
  const { data: modules = [] } = useModules();
  const { data: formateurs = [] } = useUsers({ role: 'formateur' });

  const [semaineDebut, setSemaineDebut] = useState('');
  const [draft, setDraft] = useState(EMPTY_ROW);
  const [entries, setEntries] = useState([]);
  const [templateId, setTemplateId] = useState(null);

  const nameOf = (list, id, fmt) => {
    const x = list.find((e) => e._id === id);
    return x ? fmt(x) : '—';
  };

  const selectedModule = modules.find((m) => m._id === draft.module);
  const filteredSalles = selectedModule?.salles?.length
    ? salles.filter((s) => selectedModule.salles.map((id) => String(id)).includes(String(s._id)))
    : salles;

  const addRow = () => {
    if (!draft.formateur || !draft.groupe || !draft.salle || !draft.module) {
      toast.error('Sélectionnez formateur, groupe, salle et module.');
      return;
    }
    setEntries([...entries, draft]);
    setDraft(EMPTY_ROW);
    setTemplateId(null);
  };

  const upload = useMutation({
    mutationFn: () => api.post('/schedule/upload', { semaineDebut, entries }).then((r) => r.data),
    onSuccess: (data) => {
      setTemplateId(data._id);
      toast.success('Emploi du temps enregistré. Vous pouvez générer les sessions.');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/schedule/generate-sessions', { templateId }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(`${data.count} session(s) générée(s).`);
      setEntries([]);
      setTemplateId(null);
    },
    onError: (err) => toast.error(apiError(err, 'Conflit ou erreur lors de la génération.')),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>1. Semaine concernée</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label>Lundi de la semaine</Label>
            <Input type="date" value={semaineDebut} onChange={(e) => setSemaineDebut(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Ajouter un créneau</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Jour">
              <Select value={draft.jour} onValueChange={(v) => setDraft({ ...draft, jour: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOURS.map((j) => <SelectItem key={j} value={j} className="capitalize">{j}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Début"><Input type="time" value={draft.heureDebut} onChange={(e) => setDraft({ ...draft, heureDebut: e.target.value })} /></Field>
            <Field label="Fin"><Input type="time" value={draft.heureFin} onChange={(e) => setDraft({ ...draft, heureFin: e.target.value })} /></Field>
            <Field label="Module">
              <Select
                value={draft.module}
                onValueChange={(v) => {
                  const nextModule = modules.find((m) => m._id === v);
                  const nextSalleIds = nextModule?.salles?.map((s) => s._id) || [];
                  setDraft({ ...draft, module: v, salle: nextSalleIds.includes(draft.salle) ? draft.salle : '' });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>{modules.map((m) => <SelectItem key={m._id} value={m._id}>{m.nom}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Formateur">
              <Select value={draft.formateur} onValueChange={(v) => setDraft({ ...draft, formateur: v })}>
                <SelectTrigger><SelectValue placeholder="Formateur" /></SelectTrigger>
                <SelectContent>{formateurs.map((f) => <SelectItem key={f._id} value={f._id}>{f.prenom} {f.nom}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Groupe">
              <Select value={draft.groupe} onValueChange={(v) => setDraft({ ...draft, groupe: v })}>
                <SelectTrigger><SelectValue placeholder="Groupe" /></SelectTrigger>
                <SelectContent>{groupes.map((g) => <SelectItem key={g._id} value={g._id}>{g.nom}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Salle">
              <Select value={draft.salle} onValueChange={(v) => setDraft({ ...draft, salle: v })}>
                <SelectTrigger><SelectValue placeholder="Salle" /></SelectTrigger>
                <SelectContent>
                  {filteredSalles.length > 0 ? (
                    filteredSalles.map((s) => <SelectItem key={s._id} value={s._id}>{s.nom}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>Aucune salle disponible</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="button" onClick={addRow} className="w-full"><Plus className="h-4 w-4" /> Ajouter</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>3. Créneaux ({entries.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!semaineDebut || entries.length === 0 || upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />} Enregistrer
            </Button>
            <Button disabled={!templateId || generate.isPending} onClick={() => generate.mutate()}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Générer les sessions
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-6"><EmptyState title="Aucun créneau" description="Ajoutez des créneaux à la semaine." /></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Jour</TableHead><TableHead>Horaire</TableHead><TableHead>Module</TableHead><TableHead>Formateur</TableHead><TableHead>Groupe</TableHead><TableHead>Salle</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {entries.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="capitalize font-medium">{e.jour}</TableCell>
                    <TableCell className="text-muted-foreground">{e.heureDebut}–{e.heureFin}</TableCell>
                    <TableCell>{nameOf(modules, e.module, (m) => m.nom)}</TableCell>
                    <TableCell className="text-muted-foreground">{nameOf(formateurs, e.formateur, (f) => `${f.prenom} ${f.nom}`)}</TableCell>
                    <TableCell className="text-muted-foreground">{nameOf(groupes, e.groupe, (g) => g.nom)}</TableCell>
                    <TableCell className="text-muted-foreground">{nameOf(salles, e.salle, (s) => s.nom)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setEntries(entries.filter((_, idx) => idx !== i)); setTemplateId(null); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
