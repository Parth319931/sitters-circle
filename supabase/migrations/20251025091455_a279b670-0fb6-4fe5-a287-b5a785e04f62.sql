-- Drop the existing check constraint on bookings status
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add updated check constraint with all valid status values
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'upcoming', 'active', 'completed', 'cancelled', 'denied'));