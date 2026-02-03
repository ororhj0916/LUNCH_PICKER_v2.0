import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to provided credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qtblnqqzfnbqtoadpihq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0YmxucXF6Zm5icXRvYWRwaWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQ3NzUsImV4cCI6MjA4NTAyMDc3NX0.seR2odAM8UPCJHol-0_-UlAeVRZL1ODL_18Ie-6Jm1A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function formatSbError(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const msg =
    err.message ||
    err.error_description ||
    err.hint ||
    JSON.stringify(err);
  return msg;
}
