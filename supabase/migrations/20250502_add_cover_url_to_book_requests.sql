-- Add cover_url column to book_requests for storing cover image URL
alter table if exists book_requests
add column cover_url text default null;
