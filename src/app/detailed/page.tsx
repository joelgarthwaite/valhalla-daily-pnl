import { redirect } from 'next/navigation';

// Redirect old /detailed path to new /pnl/detailed
export default function DetailedRedirect() {
  redirect('/pnl/detailed');
}
