// ============================================================
// PUNTOSTOCK — Supabase Configuration
// Reemplazá estos valores con los de tu proyecto Supabase
// Dashboard → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://yvqcgjvxwdktyonbehil.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cWNnanZ4d2RrdHlvbmJlaGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjY5MDcsImV4cCI6MjA5NzMwMjkwN30.b0IF4E-CtI4wen2eQQEW2sG_-bKtK970MB-wW0B0pvI';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// Helper: obtener businessId del usuario autenticado
// ============================================================
async function getBusinessId() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profiles').select('business_id').eq('id', user.id).single();
  return data?.business_id ?? null;
}
