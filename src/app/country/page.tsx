import { redirect } from 'next/navigation';

// Redirect old /country path to new /pnl/country
export default function CountryRedirect() {
  redirect('/pnl/country');
}
