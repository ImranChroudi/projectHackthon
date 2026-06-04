import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, PlayCircle, Loader2, Clock, RefreshCw, Copy, ExternalLink, Check, X } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime, formatTime } from '@/lib/format';

export function SessionDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get(`/sessions/${id}`).then((r) => r.data),
  });

  const isActive = session?.status === 'active';

  // Horloge légère pour (dés)activer le bouton dès l'entrée/sortie du créneau.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const dansCreneau = session
    ? now >= new Date(session.start).getTime() && now <= new Date(session.end).getTime()
    : false;

  const activate = useMutation({
    mutationFn: () => api.post(`/sessions/${id}/activate`),
    onSuccess: () => {
      toast.success('Session activée.');
      qc.invalidateQueries({ queryKey: ['session', id] });
      qc.invalidateQueries({ queryKey: ['qr', id] });
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/formateur/sessions">
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
      </Button>

      <PageHeader
        title={session?.module?.nom || 'Session'}
        description={session ? `${session.groupe?.nom} · ${formatDateTime(session.start)}` : ''}
      >
        {session && <StatusBadge type="session" value={session.status} />}
      </PageHeader>

      {session?.status === 'planifie' && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <p className="text-sm text-muted-foreground">
              {dansCreneau
                ? 'Activez la session pour afficher le QR code de présence.'
                : `La session ne peut être activée que pendant son créneau (${formatDateTime(session.start)} – ${formatTime(session.end)}).`}
            </p>
            <Button onClick={() => activate.mutate()} disabled={activate.isPending || !dansCreneau}>
              {activate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Activer la session
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="qr">
        <TabsList>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
          <TabsTrigger value="presences">Feuille de présence</TabsTrigger>
        </TabsList>
        <TabsContent value="qr">
          <QrPanel
            sessionId={id}
            active={isActive}
            canReactivate={dansCreneau}
            reactivating={activate.isPending}
            onReactivate={() => activate.mutate()}
          />
        </TabsContent>
        <TabsContent value="presences">
          <AttendancePanel sessionId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QrPanel({ sessionId, active, canReactivate, reactivating, onReactivate }) {
  const { data, isError, error } = useQuery({
    queryKey: ['qr', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/qr`).then((r) => r.data),
    enabled: active,
    // Rafraîchit le QR à la cadence de rotation du backend.
    refetchInterval: (q) => (q.state.data?.rotationSeconds || 12) * 1000,
  });

  if (!active) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState icon={Clock} title="Session non active" description="Activez la session pour générer le QR code." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8">
        {isError ? (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              icon={Clock}
              title="Fenêtre de scan fermée"
              description={
                canReactivate
                  ? 'La fenêtre de 15 minutes est écoulée. Rouvrez-la pour réafficher un QR code valable.'
                  : apiError(error, "La fenêtre de scan est expirée et le créneau de la session est terminé.")
              }
            />
            {canReactivate && (
              <Button onClick={onReactivate} disabled={reactivating}>
                {reactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Rouvrir la fenêtre de scan
              </Button>
            )}
          </div>
        ) : data ? (
          <>
            <div className="rounded-2xl border-4 border-primary/10 bg-white p-4 shadow-sm">
              <img src={data.dataUrl} alt="QR code de présence" className="h-64 w-64" />
            </div>
            <Countdown expiresAt={data.expiresAt} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Le code se renouvelle toutes les {data.rotationSeconds}s — anti-fraude.
            </p>
            <TestLink sessionId={data.sessionId} token={data.token} />
          </>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </CardContent>
    </Card>
  );
}

// Lien de test : ouvre la page de scan avec la charge utile en query string
// (même contenu que le QR) pour valider une présence sans caméra.
function TestLink({ sessionId, token }) {
  const url = `${window.location.origin}/stagiaire/scanner?s=${sessionId}&t=${encodeURIComponent(token)}`;
  return (
    <div className="w-full max-w-md space-y-1.5 rounded-lg border border-dashed bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">Lien de test (sans scan)</p>
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 truncate text-xs text-primary underline underline-offset-2"
          title={url}
        >
          {url}
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          title="Copier le lien"
          onClick={() => { navigator.clipboard?.writeText(url); toast.success('Lien copié.'); }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="Ouvrir" asChild>
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        À ouvrir dans une session <strong>stagiaire</strong> (un autre navigateur ou une fenêtre privée) — sinon vous serez
        redirigé vers votre espace. Le jeton change à chaque rotation : recopiez le lien s'il est refusé.
      </p>
    </div>
  );
}

function Countdown({ expiresAt }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  const expired = left <= 0;

  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${expired ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
      <Clock className="h-4 w-4" />
      {expired ? 'Fenêtre de scan expirée' : `Fermeture dans ${m}:${s}`}
    </div>
  );
}

function AttendancePanel({ sessionId }) {
  const qc = useQueryClient();
  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['roster', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}/roster`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const mark = useMutation({
    mutationFn: ({ stagiaire, status }) =>
      api.put(`/sessions/${sessionId}/attendance`, { stagiaire, status }),
    // Mise à jour optimiste : la ligne réagit immédiatement.
    onMutate: async ({ stagiaire, status }) => {
      await qc.cancelQueries({ queryKey: ['roster', sessionId] });
      const prev = qc.getQueryData(['roster', sessionId]);
      qc.setQueryData(['roster', sessionId], (old = []) =>
        old.map((r) => (String(r.stagiaire._id) === String(stagiaire) ? { ...r, status, manuel: true } : r))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['roster', sessionId], ctx.prev);
      toast.error(apiError(err));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['roster', sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance', 'session', sessionId] });
    },
  });

  const presents = roster.filter((r) => r.status === 'present' || r.status === 'retard').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feuille d'appel ({presents}/{roster.length} présents)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Marquage manuel — repli si un stagiaire ne peut pas scanner le QR code.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {!isLoading && roster.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Aucun stagiaire" description="Ce groupe n'a aucun stagiaire inscrit." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stagiaire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Marquer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((r) => (
                <TableRow key={r.stagiaire._id}>
                  <TableCell>
                    <div className="font-medium">{r.stagiaire.prenom} {r.stagiaire.nom}</div>
                    <div className="text-xs text-muted-foreground">{r.stagiaire.email}</div>
                  </TableCell>
                  <TableCell>
                    {r.status ? (
                      <span className="flex items-center gap-1.5">
                        <StatusBadge value={r.status} />
                        {r.manuel && <span className="text-[11px] text-muted-foreground">(manuel)</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non marqué</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1.5">
                      <MarkButton
                        active={r.status === 'present'}
                        variant="success"
                        icon={Check}
                        label="Présent"
                        disabled={mark.isPending}
                        onClick={() => mark.mutate({ stagiaire: r.stagiaire._id, status: 'present' })}
                      />
                      <MarkButton
                        active={r.status === 'retard'}
                        variant="default"
                        icon={Clock}
                        label="Retard"
                        disabled={mark.isPending}
                        onClick={() => mark.mutate({ stagiaire: r.stagiaire._id, status: 'retard' })}
                      />
                      <MarkButton
                        active={r.status === 'absent_injustifie'}
                        variant="destructive"
                        icon={X}
                        label="Absent"
                        disabled={mark.isPending}
                        onClick={() => mark.mutate({ stagiaire: r.stagiaire._id, status: 'absent_injustifie' })}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Bouton de marquage : plein quand c'est le statut actif, sinon en contour discret.
function MarkButton({ active, variant, icon: Icon, label, disabled, onClick }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? variant : 'outline'}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
