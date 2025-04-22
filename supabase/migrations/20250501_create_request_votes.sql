-- Create table for votes on book requests
create table if not exists request_votes (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.book_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz default now(),
  unique(request_id, user_id)
);
