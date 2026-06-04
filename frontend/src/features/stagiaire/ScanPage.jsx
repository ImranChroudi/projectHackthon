import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, ShieldCheck, Info, Clock, Wifi } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const REGION_ID = 'qr-reader';

// Styles + icône par tonalité du panneau de résultat.
const TONES = {
  success: { box: 'border-success/30 bg-success/10 text-success', Icon: CheckCircle2 },
  info: { box: 'border-primary/30 bg-primary/10 text-primary', Icon: Info },
  error: { box: 'border-destructive/30 bg-destructive/10 text-destructive', Icon: XCircle },
};

// Traduit une erreur de scan en panneau clair : titre court + cause + conseil d'action.
// La catégorie se déduit du code HTTP (et du libellé pour distinguer les deux cas 403).
function interpretScanError(err) {
  const status = err?.response?.status;
  const message = apiError(err, 'Scan refusé.');
  const low = message.toLowerCase();

  if (status === 409) {
    // Déjà présent : ce n'est pas un échec, juste une information rassurante.
    return { tone: 'info', Icon: CheckCircle2, title: 'Présence déjà enregistrée', message, hint: 'Rien à refaire — votre présence pour cette session est déjà prise.' };
  }
  if (status === 403 && (low.includes('wifi') || low.includes('réseau') || low.includes('reseau'))) {
    return { tone: 'error', Icon: Wifi, title: 'Réseau du centre requis', message, hint: 'Connectez-vous au WiFi du centre, puis scannez à nouveau.' };
  }
  if (status === 403 && low.includes('groupe')) {
    return { tone: 'error', title: 'Session d’un autre groupe', message, hint: "Cette session n'est pas destinée à votre groupe." };
  }
  if (status === 410) {
    return { tone: 'error', Icon: Clock, title: 'QR code expiré', message, hint: 'La fenêtre de présence est fermée. Demandez à votre formateur de réafficher le code.' };
  }
  if (status === 400) {
    return { tone: 'error', title: 'QR code invalide', message, hint: 'Le code change toutes les quelques secondes. Scannez celui actuellement affiché à l’écran.' };
  }
  if (status === 404) {
    return { tone: 'error', title: 'Session introuvable', message, hint: null };
  }
  return { tone: 'error', title: 'Scan refusé', message, hint: null };
}

// Extrait { s, t } d'un QR : nouvelle forme URL (.../scanner?s=..&t=..)
// ou ancienne charge utile JSON {"s":..,"t":..}.
function extractPayload(text) {
  if (!text) return null;
  try {
    const u = new URL(text);
    const s = u.searchParams.get('s');
    const t = u.searchParams.get('t');
    if (s && t) return { s, t };
  } catch {
    /* pas une URL — on tente le JSON */
  }
  try {
    const p = JSON.parse(text);
    if (p?.s && p?.t) return { s: p.s, t: p.t };
  } catch {
    /* ni URL ni JSON */
  }
  return null;
}

export function ScanPage() {
  const scannerRef = useRef(null);
  const autoDone = useRef(false);
  const [params] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  // Nettoyage à la sortie.
  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lien de test : /stagiaire/scanner?s=<sessionId>&t=<token> → enregistre la présence sans caméra.
  useEffect(() => {
    if (autoDone.current) return;
    const s = params.get('s');
    const t = params.get('t');
    if (s && t) {
      autoDone.current = true;
      handleDecoded(JSON.stringify({ s, t }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function stopScanner() {
    const s = scannerRef.current;
    if (s && s.isScanning) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* ignore */
      }
    }
    scannerRef.current = null;
    setScanning(false);
  }

  async function handleDecoded(text) {
    if (busy) return;
    const payload = extractPayload(text);
    if (!payload) {
      setResult({
        tone: 'error',
        title: 'QR code non reconnu',
        message: 'Ce code n’est pas un QR de présence.',
        hint: 'Scannez le QR affiché par votre formateur.',
      });
      return;
    }

    setBusy(true);
    await stopScanner();
    try {
      const res = await api.post(`/sessions/${payload.s}/scan`, { token: payload.t });
      const retard = res.data.status === 'retard';
      setResult({
        tone: 'success',
        title: retard ? 'Présence enregistrée — en retard' : 'Présence enregistrée',
        message: res.data.message || 'Présence enregistrée.',
        hint: retard
          ? 'Vous avez été marqué en retard : la période de pointage initiale était dépassée.'
          : null,
      });
    } catch (err) {
      setResult(interpretScanError(err));
    } finally {
      setBusy(false);
    }
  }

  async function startScanner() {
    setResult(null);
    setScanning(true);
    try {
      const html5 = new Html5Qrcode(REGION_ID);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleDecoded,
        () => {} // erreurs de décodage par frame : ignorées
      );
    } catch {
      setScanning(false);
      setResult({
        tone: 'error',
        Icon: Camera,
        title: 'Caméra indisponible',
        message: "Impossible d'accéder à la caméra.",
        hint: "Autorisez l'accès à la caméra et réessayez (HTTPS ou localhost requis).",
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Scanner ma présence" description="Scannez le QR code affiché par votre formateur." />

      <Card>
        <CardContent className="p-6">
          {/* Avis anti-fraude */}
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-accent/50 px-3 py-2 text-xs text-primary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Le scan doit être effectué depuis le réseau WiFi du centre. Après validation, la déconnexion est
              temporairement bloquée (anti-fraude).
            </span>
          </div>

          {/* Résultat — panneau d'état clair (succès / info / erreur) */}
          {result && (() => {
            const tone = TONES[result.tone] || TONES.error;
            const Icon = result.Icon || tone.Icon;
            return (
              <div className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${tone.box}`}>
                <Icon className="mt-0.5 h-6 w-6 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{result.title}</p>
                  <p className="text-sm opacity-90">{result.message}</p>
                  {result.hint && <p className="mt-1 text-xs opacity-80">{result.hint}</p>}
                </div>
              </div>
            );
          })()}

          {/* Zone caméra */}
          <div
            id={REGION_ID}
            className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border bg-muted/30"
          />

          {!scanning && (
            <div className="mt-4 flex flex-col items-center gap-3 text-center text-muted-foreground">
              {!result && <Camera className="h-10 w-10" />}
              <Button onClick={startScanner} disabled={busy} size="lg">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                {result ? 'Scanner à nouveau' : 'Démarrer la caméra'}
              </Button>
            </div>
          )}

          {scanning && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={stopScanner}>
                Arrêter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
