-- Enable row level security for public tables flagged by Supabase.
-- The app uses custom auth through server-side API routes, so no anon/authenticated
-- policies are added here.
ALTER TABLE public."EventVolunteerNeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventVolunteerSignup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamInvite" ENABLE ROW LEVEL SECURITY;
