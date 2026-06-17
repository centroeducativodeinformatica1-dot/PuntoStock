// ============================================================
// PUNTOSTOCK — Supabase Configuration
// Reemplazá estos valores con los de tu proyecto Supabase
// Dashboard → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'TU_ANON_KEY';

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
