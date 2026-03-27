import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
export const supabase = createClient(supabaseUrl, publicAnonKey);

/**
 * Get a fresh access token from the current session.
 * Uses refreshSession() to ensure the token is valid and not expired.
 * Falls back to the public anon key if no session exists.
 * This prevents "Invalid JWT" errors from stale cached tokens.
 */
export async function getFreshToken(): Promise<string> {
  try {
    // First try getting the current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return publicAnonKey;
    }

    // Check if token is close to expiry (within 60 seconds)
    const expiresAt = session.expires_at; // Unix timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt && expiresAt - now < 60) {
      // Token is expired or about to expire — force a refresh
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
      if (error || !refreshedSession?.access_token) {
        console.warn('[Nudge] Token refresh failed, falling back to anon key:', error?.message);
        return publicAnonKey;
      }
      return refreshedSession.access_token;
    }

    return session.access_token;
  } catch (err) {
    console.warn('[Nudge] getFreshToken error, falling back to anon key:', err);
    return publicAnonKey;
  }
}