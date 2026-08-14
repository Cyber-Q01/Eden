const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ytpggbkndnynyzashexk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cGdnYmtuZG55bnl6YXNoZXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjQzOTksImV4cCI6MjA5MjAwMDM5OX0.ybjraYu7wGmUkLp3CxH_jQ-o3IFd64Jdnhv3GcKjzz8';
const authToken = 'eyJhbGciOiJFUzI1NiIsImtpZCI6Ijg4YzQ3MjE5LTkwY2UtNDIyNC05YmRjLTFmZTg0NTdkNzUwZCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3l0cGdnYmtuZG55bnl6YXNoZXhrLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlMDg0NGJmZS1hMjg5LTQ1YzUtYWY5Ni0zNTA0YjJlZWIwYmIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc5MTA2NjI2LCJpYXQiOjE3NzkxMDMwMjYsImVtYWlsIjoiZm9sb3J1bnNob2EwOEBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBsZXRlZF9iaW9kYXRhIjp0cnVlLCJlbWFpbCI6ImZvbG9ydW5zaG9hMDhAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcnN0TmFtZSI6IlRhaXdvICIsImxhc3ROYW1lIjoiRm9sb3J1bnNobyIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicm9sZSI6IlRFTkFOVCIsInN1YiI6ImUwODQ0YmZlLWEyODktNDVjNS1hZjk2LTM1MDRiMmVlYjBiYiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc5MTAzMDI2fV0sInNlc3Npb25faWQiOiI3YTMxMDhkYy0wMDA5LTQ5OWYtYmI1YS1hMmNlNWJkNzY3MzgiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.GEP0CdwMZtPaV-HilM5pPcjJGlxRFPbrSqcs11MLtBnzHESJLzBgBhC4zl5Nf0PSCkYxVG63XBZ3UsnKJDmpMw';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function check() {
  console.log('--- Setting session ---');
  const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
    access_token: authToken,
    refresh_token: ''
  });

  if (sessionErr) {
    console.error('Error setting session:', sessionErr);
    return;
  }
  console.log('Signed in as:', sessionData.user.email);

  console.log('--- Fetching own record in public.users ---');
  const { data: userRow, error: userRowErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionData.user.id)
    .single();

  if (userRowErr) {
    console.error('Error fetching users row:', userRowErr);
  } else {
    console.log('User row in public.users:', userRow);
  }

  console.log('--- Fetching rentals ---');
  const { data: rentals, error: rentalsErr } = await supabase
    .from('rentals')
    .select('*, properties(*)');

  if (rentalsErr) {
    console.error('Error fetching rentals:', rentalsErr);
  } else {
    console.log('Rentals:', rentals);
  }
}

check();
