import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authForgot, authLogin, authLogout, authReset, authSession, authSignup, AuthSession } from '@/lib/authClient';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

const Account = () => {
  const [params] = useSearchParams();
  const resetToken = params.get('token') || '';
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'reset' && resetToken ? 'reset' : 'login');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Account | FrenchyFab Care Compass';
    authSession()
      .then(setSession)
      .catch(() => setSession({ authenticated: false }));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        setSession(await authSignup(email, password));
        setPassword('');
      } else if (mode === 'login') {
        setSession(await authLogin(email, password));
        setPassword('');
      } else if (mode === 'forgot') {
        await authForgot(email);
        setMessage('If that email has an account, a reset link is on its way.');
      } else {
        setSession(await authReset(resetToken, password));
        setPassword('');
        setMessage('Password updated.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setError('');
    setBusy(true);
    try {
      await authLogout();
      setSession({ authenticated: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log out.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="max-w-md mx-auto">
        <Link to="/" className="text-xs font-bold text-muted-foreground hover:text-foreground">← Care plan</Link>
        <h1 className="mt-4 text-3xl font-black font-display text-foreground">Your account</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The free quiz does not need an account. An account keeps the same login on this browser and shows a Care Vault that was bought with the same email.
        </p>

        {session?.authenticated ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm text-foreground">Signed in as <strong>{session.email}</strong></p>
            <p className="text-sm text-muted-foreground">
              {session.premium
                ? 'A paid Care Vault is linked to this email. Open your plan to see it.'
                : 'No paid vault is linked to this email yet. The vault is a one-time purchase, not a subscription.'}
            </p>
            <Button type="button" onClick={logout} disabled={busy} variant="outline" className="w-full h-11 rounded-xl font-bold">
              Log out
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex gap-2 text-sm font-bold">
              {(['login', 'signup', 'forgot'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setMode(item); setError(''); setMessage(''); }}
                  className={mode === item ? 'text-foreground underline' : 'text-muted-foreground'}
                >
                  {item === 'login' ? 'Log in' : item === 'signup' ? 'Create account' : 'Reset password'}
                </button>
              ))}
            </div>

            {mode !== 'reset' && (
              <label className="block text-sm font-bold text-foreground">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 font-normal"
                />
              </label>
            )}

            {mode !== 'forgot' && (
              <label className="block text-sm font-bold text-foreground">
                {mode === 'reset' ? 'New password' : 'Password'}
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-border bg-background px-3 font-normal"
                />
              </label>
            )}

            {mode !== 'login' && mode !== 'forgot' && (
              <p className="text-xs text-muted-foreground">At least 10 characters. This is not your Stripe password.</p>
            )}

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {message && <p className="text-sm text-foreground" role="status">{message}</p>}

            <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl font-bold">
              {busy ? 'Working…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Email reset link' : mode === 'reset' ? 'Save password' : 'Log in'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
};

export default Account;
