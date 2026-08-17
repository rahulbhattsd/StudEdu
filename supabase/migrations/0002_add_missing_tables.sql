-- 0002_add_missing_tables.sql
-- server.js queries these four tables (resources, resource_ratings, events,
-- semester_grades) but 0001_prep_tracker.sql never created them.
-- That's why every request to /api/resources, /api/events, and
-- /api/semester-grades has been failing with "relation does not exist"
-- from Supabase (500 errors), even though the SUPABASE_URL/KEY connection
-- itself is fine.

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course text not null,
  file_url text not null,
  uploaded_by uuid not null,
  uploaded_by_name text not null,
  average_rating numeric(3,2) default 0,
  created_at timestamptz default now()
);

create table if not exists resource_ratings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  user_id uuid not null,
  rating numeric not null check (rating >= 0 and rating <= 5),
  created_at timestamptz default now(),
  unique (resource_id, user_id) -- required for the .upsert(onConflict: ["resource_id","user_id"]) call
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  "start" timestamptz not null,
  "end" timestamptz,
  description text,
  created_at timestamptz default now()
);

create table if not exists semester_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  sem text not null,
  grade numeric not null check (grade >= 0 and grade <= 10),
  created_at timestamptz default now()
);

-- Matches the rest of the schema: RLS is left off here too (0001 never
-- enabled it either). If RLS is ON for these tables in the live Supabase
-- project (Table Editor turns it on by default for tables created via the
-- UI), that alone will also block the backend unless it's using the
-- service_role key or explicit policies are added.
