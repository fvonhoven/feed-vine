import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/database"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://demo.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "demo-key"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Flag to check if we're in demo mode
export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
