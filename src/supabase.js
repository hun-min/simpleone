import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://njywvoqiejiydvvmzhog.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeXd2b3FpZWppeWR2dm16aG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTQ5NDgsImV4cCI6MjA3NzI5MDk0OH0.waBdD4Ze7Sftohd7ks77cQx2-mQuoQsQqD25Md0ykEI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
