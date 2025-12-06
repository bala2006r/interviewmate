import { createClient } from '@supabase/supabase-js';

// Use provided credentials
export const supabaseUrl = process.env.SUPABASE_URL || 'https://mrcmejrfqizvxqwpoyci.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yY21lanJmcWl6dnhxd3BveWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDExNTgsImV4cCI6MjA4MDU3NzE1OH0.GQPHfa3wDS4X1xzI_XV_ul5_6LOUpAhy8C01pZEr4v8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);