-- Create cron job to run vaccination reminder daily at 9 AM
SELECT cron.schedule(
  'vaccination-reminder-daily',
  '0 9 * * *', -- Run at 9 AM every day
  $$
  SELECT
    net.http_post(
      url:='https://xjdkxrddooyzhbnwcjic.supabase.co/functions/v1/vaccination-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZGt4cmRkb295emhibndjamljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODU4MjcsImV4cCI6MjA3MTM2MTgyN30.wrI-WnCzBDv6USpLa-7ekypWWNlt-4Rbxz2g8gtAlDQ"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
