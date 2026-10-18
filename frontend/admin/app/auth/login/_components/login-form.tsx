'use client';

import { LogIn } from 'lucide-react';
import { useState } from 'react';

import { signIn } from '@/app/_actions/auth';
import { publicPath } from '@/lib/base-path';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // The action returns an outcome rather than throwing: a thrown error inside a form is a
    // crashed page, not a message.
    const result = await signIn(email, password);
    if (result.ok) {
      // A full load rather than a router push, so the new session cookie is read by the layout's
      // check. `window.location` is a browser API and knows nothing of basePath — hence publicPath.
      window.location.href = publicPath('/');
      return;
    }
    setError(result.error);
    setBusy(false);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>SettleFlow operations</CardTitle>
        <CardDescription>
          The console reads the database directly. It shows what the system did; it does not move
          money.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          {error ? (
            <Alert variant="err">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            <LogIn />
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
