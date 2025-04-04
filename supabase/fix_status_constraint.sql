-- First, drop the status constraint
ALTER TABLE public.book_requests
DROP CONSTRAINT IF EXISTS book_requests_status_check;

-- Now add a more comprehensive constraint that matches your app's values
ALTER TABLE public.book_requests
ADD CONSTRAINT book_requests_status_check
CHECK (
  status IN (
    'pending', 'Pending', 'PENDING',
    'fulfilled', 'Fulfilled', 'FULFILLED', 
    'rejected', 'Rejected', 'REJECTED',
    'in progress', 'In Progress', 'IN PROGRESS'
  )
);

-- ALTERNATIVE: remove the constraint entirely if you prefer
-- No constraint means any status value will be accepted
-- ALTER TABLE public.book_requests
-- DROP CONSTRAINT IF EXISTS book_requests_status_check;
