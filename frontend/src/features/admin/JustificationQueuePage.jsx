import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X, FileText, Loader2, Paperclip } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader, TableSkeleton } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

export function JustificationQueuePage() {
  const qc = useQueryClient();
  const [statut, setStatut] = useState('en_attente');
  const [refusing, setRefusing] = useState(null);
  const [motif, setMotif] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['justifications', statut],
    queryFn: () => api.get('/justifications', { params: { statut } }).then((r) => r.data),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision, motifRefus }) => api.patch(`/justifications/${id}`, { decision, motifRefus }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Traité.');
      qc.invalidateQueries({ queryKey: ['justifications'] });
      setRefusing(null);
      setMotif('');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div>
      <PageHeader title="Justifications" description="Validez ou refusez les demandes des stagiaires." />

      <Tabs value={statut} onValueChange={setStatut} className="mb-4">
        <TabsList>
          <TabsTrigger value="en_attente">En attente</TabsTrigger>
          <TabsTrigger value="approuve">Approuvées</TabsTrigger>
          <TabsTrigger value="refuse">Refusées</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune justification" description="La file est vide." />
      ) : (
        <div className="grid gap-4">
          {items.map((j) => (
            <Card key={j._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{j.stagiaire?.prenom} {j.stagiaire?.nom}</p>
                      <StatusBadge type="justification" value={j.statut} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {j.attendance?.module?.nom} · soumis le {formatDateTime(j.createdAt)}
                    </p>
                    <p className="mt-2 text-sm">{j.texte || <span className="text-muted-foreground">Sans commentaire</span>}</p>
                    {j.documents?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {j.documents.map((d, i) => (
                          <a
                            key={i}
                            href={`/uploads/${d.filename}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-primary hover:bg-muted"
                          >
                            <Paperclip className="h-3.5 w-3.5" /> {d.originalName || `Document ${i + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                    {j.statut === 'refuse' && j.motifRefus && (
                      <p className="mt-2 text-xs text-destructive">Motif du refus : {j.motifRefus}</p>
                    )}
                  </div>

                  {j.statut === 'en_attente' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => decide.mutate({ id: j._id, decision: 'approuve' })} disabled={decide.isPending}>
                        <Check className="h-4 w-4" /> Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRefusing(j)}>
                        <X className="h-4 w-4" /> Refuser
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!refusing} onOpenChange={(o) => !o && setRefusing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser la justification</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Motif du refus</Label>
            <Textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Expliquez la raison du refus…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefusing(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => decide.mutate({ id: refusing._id, decision: 'refuse', motifRefus: motif })} disabled={decide.isPending}>
              {decide.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
