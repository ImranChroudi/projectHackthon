import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Megaphone, Upload, FileText } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { usePosts } from '@/hooks/queries';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Attachments } from '@/components/Attachments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDIENCE_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

const EMPTY = { titre: '', contenu: '', audience: 'tous' };

export function PostsPage() {
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = usePosts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);

  const create = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('titre', form.titre);
      fd.append('contenu', form.contenu);
      fd.append('audience', form.audience);
      files.forEach((f) => fd.append('fichiers', f));
      return api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success('Annonce publiée.');
      qc.invalidateQueries({ queryKey: ['posts'] });
      setForm(EMPTY);
      setFiles([]);
      setOpen(false);
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      toast.success('Annonce supprimée.');
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div>
      <PageHeader title="Annonces" description="Communiquez avec les formateurs et les stagiaires.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nouvelle annonce</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle annonce</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Titre</Label>
                <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Contenu</Label>
                <Textarea value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} required className="min-h-[120px]" />
              </div>
              <div className="space-y-1.5">
                <Label>Destinataires</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tout le monde</SelectItem>
                    <SelectItem value="formateurs">Formateurs uniquement</SelectItem>
                    <SelectItem value="stagiaires">Stagiaires uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="post-files">Pièces jointes (optionnel)</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  {files.length > 0 ? `${files.length} fichier(s) sélectionné(s)` : 'Choisir des fichiers'}
                  <input
                    id="post-files"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
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
                <Button type="button" variant="outline" onClick={() => { setFiles([]); setOpen(false); }}>Annuler</Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Publier
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {!isLoading && posts.length === 0 ? (
        <EmptyState icon={Megaphone} title="Aucune annonce" description="Publiez votre première annonce." />
      ) : (
        <div className="grid gap-4">
          {posts.map((p) => (
            <Card key={p._id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{p.titre}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{AUDIENCE_LABELS[p.audience]}</Badge>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(p._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-foreground/90">{p.contenu}</p>
                <Attachments items={p.piecesJointes} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
