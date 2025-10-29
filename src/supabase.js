import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jpsvhbnjvwgjbrvsqckl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impwc3ZoYm5qdndnamJydnNxY2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2OTUxNTksImV4cCI6MjA3NzI3MTE1OX0.jJ0PlS71Ig0-ZpNCHDH4iqn34uA_qdHFqfw38VoUwUs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
