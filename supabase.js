import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sxhfgczctilyrlwvweof.supabase.co'
const supabaseKey = 'sb_publishable_w-tCfTQqWSL6v8Vzp29xUw_04kJfvAL'

export const supabase = createClient(supabaseUrl, supabaseKey)
