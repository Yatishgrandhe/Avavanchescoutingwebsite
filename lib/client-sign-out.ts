import type { SupabaseClient } from '@supabase/supabase-js';

/** End all sessions server-side and clear local auth storage (PKCE / refresh tokens). */
export async function clientSignOut(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    console.warn('auth.signOut(global) failed, falling back to local', error);
    await supabase.auth.signOut({ scope: 'local' });
  }
}
