-- Create the pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements SCHEMA extensions;

-- Create health table for service health checks
CREATE TABLE IF NOT EXISTS public.health (
    id SERIAL PRIMARY KEY,
    service TEXT NOT NULL,
    status BOOLEAN DEFAULT true,
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health status
INSERT INTO public.health (service, status) VALUES ('system', true)
ON CONFLICT (id) DO UPDATE
SET status = true;

-- Basic health check function
CREATE OR REPLACE FUNCTION public.check_health()
RETURNS BOOLEAN AS $$
BEGIN
  -- Update last check time
  INSERT INTO public.health (service, status, last_check)
  VALUES ('system', true, CURRENT_TIMESTAMP)
  ON CONFLICT (id) DO UPDATE
  SET last_check = CURRENT_TIMESTAMP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql; 