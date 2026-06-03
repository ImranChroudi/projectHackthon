import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { homePathForRole } from '@/routes/ProtectedRoute';
import { apiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
});

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erreur, setErreur] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  // Déjà connecté -> redirige vers son espace.
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;

  const onSubmit = async (values) => {
    setErreur(null);
    try {
      const u = await login(values.email, values.password);
      // On conserve la query string (?s&t du QR) et le hash de la destination d'origine.
      const from = location.state?.from;
      const dest = from
        ? `${from.pathname}${from.search || ''}${from.hash || ''}`
        : homePathForRole(u.role);
      navigate(dest, { replace: true });
    } catch (err) {
      setErreur(apiError(err, 'Connexion impossible.'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-background to-blue-50/50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-3 shadow-lg shadow-primary/10">
            <img src="/ofppt-logo-png_seeklogo-258719.png" alt="OFPPT" className="h-full w-auto object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Plateforme de présence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Centre de formation — espace sécurisé</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" type="email" placeholder="vous@centre.ma" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {erreur && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erreur}</div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Se connecter
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Centre de formation — Gestion automatisée des présences
        </p>
      </div>
    </div>
  );
}
