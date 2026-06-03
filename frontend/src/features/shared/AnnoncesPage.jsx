import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePosts } from '@/hooks/queries';
import { AUDIENCE_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

// Liste des annonces en lecture seule (formateurs & stagiaires).
export function AnnoncesPage() {
  const { data: posts = [], isLoading } = usePosts();

  return (
    <div>
      <PageHeader title="Annonces" description="Les communications de l'administration." />
      {!isLoading && posts.length === 0 ? (
        <EmptyState icon={Megaphone} title="Aucune annonce" description="Rien à signaler pour le moment." />
      ) : (
        <div className="grid gap-4">
          {posts.map((p) => (
            <Card key={p._id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{p.titre}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.auteur?.prenom} {p.auteur?.nom} · {formatDateTime(p.createdAt)}
                  </p>
                </div>
                <Badge variant="secondary">{AUDIENCE_LABELS[p.audience]}</Badge>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-foreground/90">{p.contenu}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
