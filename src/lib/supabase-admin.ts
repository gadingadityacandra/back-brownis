import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'

// Gunakan admin client untuk bypass RLS (karena tidak ada sistem login admin)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
