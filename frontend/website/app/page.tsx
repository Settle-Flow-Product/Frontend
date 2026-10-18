import { SignIn } from '@/components/SignIn';

/* A server component rendering one client component, deliberately: there is no part of a wallet
 * sign-in a server can usefully pre-render, and pretending otherwise adds a hydration boundary
 * for nothing. */
export default function Home() {
  return <SignIn />;
}
