import { createClient } from '@supabase/supabase-js';

// Helper to safely access process.env in browser environments
const getEnv = (key: string) => {
  try {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  } catch (e) {
    return undefined;
  }
};

// Use provided credentials or fallbacks
export const supabaseUrl = getEnv('SUPABASE_URL') || 'https://mrcmejrfqizvxqwpoyci.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yY21lanJmcWl6dnhxd3BveWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDExNTgsImV4cCI6MjA4MDU3NzE1OH0.GQPHfa3wDS4X1xzI_XV_ul5_6LOUpAhy8C01pZEr4v8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);