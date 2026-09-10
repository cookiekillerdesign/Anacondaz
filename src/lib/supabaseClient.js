const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running on static fallback data.'
  );
}

// The supabase-js SDK is ~110KB gzipped. Most visitors will hit the site
// before the owner ever configures a Supabase project (the site is fully
// functional on static fallback data until then), so there's no reason to
// ship that weight on every page load. Load it lazily, only once, only if
// credentials are actually present.
let clientPromise = null;

/**
 * Resolves to a ready Supabase client, or null if not configured.
 * Safe to call from anywhere — the import + client creation only happens once.
 */
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key));
  }
  return clientPromise;
}
