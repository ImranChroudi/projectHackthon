import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, FileText } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

export function JustificationsPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState(null); // fiche de présence à justifier

  const { data: mesJustifs = [] } = useQuery({
    queryKey: ['justifications', 'me'],
    queryFn: () => api.get('/justifications/me').then((r) => r.data),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', 'me'],
    queryFn: () => api.get('/attendance/me').then((r) => r.data),
  });

  // Absences injustifiées non encore justifiées.
  const aJustifier = attendance.filter((a) => a.status === 'absent_injustifie');

  return (
    <div>
      <PageHeader title="Mes justifications" description="Justifiez vos absences et suivez leur traitement." />

      {/* Absences à justifier */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Absences à justifier</CardTitle>
        </CardHeader>
        <CardContent>
          {aJustifier.length === 0 ? (
            <EmptyState title="Aucune absence à justifier" description="Toutes vos absences sont en règle." />
          ) : (
            <ul className="divide-y">
              {aJustifier.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.module?.nom || 'Module'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(a.sessionStart)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setTarget(a)}>
                    Justifier
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Historique des justifications */}
      <Card>
        <CardHeader>
          <CardTitle>Mes demandes</CardTitle>
        </CardHeader>
        <CardContent>
          {mesJustifs.length === 0 ? (
            <EmptyState title="Aucune demande" description="Vous n'avez soumis aucune justification." />
          ) : (
            <ul className="divide-y">
              {mesJustifs.map((j) => (
                <li key={j._id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{j.attendance?.module?.nom || 'Module'}</p>
                    <p className="truncate text-xs text-muted-foreground">{j.texte || 'Sans commentaire'}</p>
                    {j.statut === 'refuse' && j.motifRefus && (
                      <p className="mt-1 text-xs text-destructive">Motif : {j.motifRefus}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(j.createdAt)}</p>
                  </div>
                  <StatusBadge type="justification" value={j.statut} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <JustifDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['justifications', 'me'] });
          qc.invalidateQueries({ queryKey: ['attendance', 'me'] });
          setTarget(null);
        }}
      />
    </div>
  );
}

function JustifDialog({ target, onClose, onDone }) {
  const [texte, setTexte] = useState('');
  const [files, setFiles] = useState([]);

  const mutation = useMutation({
    mutationFn: (formData) =>
      api.post('/justifications', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Justification soumise.');
      setTexte('');
      setFiles([]);
      onDone();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('attendanceId', target._id);
    fd.append('texte', texte);
    files.forEach((f) => fd.append('documents', f));
    mutation.mutate(fd);
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justifier une absence</DialogTitle>
          <DialogDescription>
            {target?.module?.nom} — {target && formatDateTime(target.sessionStart)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="texte">Motif</Label>
            <Textarea
              id="texte"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Expliquez la raison de votre absence…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="docs">Justificatifs (PDF, JPG, PNG)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" />
              {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Choisir des fichiers'}
              <input
                id="docs"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-1 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
