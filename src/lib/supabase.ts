import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase bilgileri girilmediyse uygulama cihaz içi örnek verilerle (demo) çalışır. */
export const isDemo = !url || !key;

export const supabase: SupabaseClient = isDemo
  ? (null as unknown as SupabaseClient)
  : createClient(url!, key!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
