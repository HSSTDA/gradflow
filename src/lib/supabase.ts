import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

export const getSupabase = () => {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error(`Supabase env missing: url=${url}, key=${key ? 'set' : 'missing'}`)
    _supabase = createClient(url, key)
  }
  return _supabase
}

export const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error(`Supabase admin env missing`)
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

// Keep for backward compatibility
export const supabase = {
  storage: { from: (bucket: string) => getSupabase().storage.from(bucket) }
}
