import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, Loader2, Camera, ShieldCheck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const REGION_ID = 'qr-reader';

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
      setResult({ ok: false, message: 'QR code non reconnu.' });
      return;
    }

    setBusy(true);
    await stopScanner();
    try {
      const res = await api.post(`/sessions/${payload.s}/scan`, { token: payload.t });
      setResult({
        ok: true,
        message: res.data.message || 'Présence enregistrée.',
        status: res.data.status,
      });
    } catch (err) {
      setResult({ ok: false, message: apiError(err, 'Scan refusé.') });
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
        ok: false,
        message: "Impossible d'accéder à la caméra. Autorisez l'accès et réessayez (HTTPS ou localhost requis).",
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

          {/* Résultat */}
          {result && (
            <div
              className={`mb-4 flex items-center gap-3 rounded-lg px-4 py-3 ${
                result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {result.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm font-medium">{result.message}</span>
            </div>
          )}

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
