import { LoginForm } from './_components/login-form';

export const metadata = { title: 'Sign in · SettleFlow operations' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginForm />
    </main>
  );
}
