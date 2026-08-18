create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  hours numeric(4,2) not null default 0,
  subjects text[] default '{}',
  tasks_completed integer default 0,
  mocks_attempted integer default 0,
  questions_solved integer default 0,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text not null,
  topic text not null,
  sort_order integer default 0,
  stages jsonb not null default '{"lectures":false,"notes":false,"practice":false,"test":false,"revision1":false,"revision2":false}',
  created_at timestamptz default now()
);

create table if not exists mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mock_type text not null check (mock_type in ('full','sectional')),
  tier text check (tier in ('tier1','tier2')),
  subject text,
  test_date date not null,
  total_marks numeric not null,
  scored_marks numeric not null,
  attempted integer,
  correct integer,
  wrong integer,
  time_taken_minutes integer,
  created_at timestamptz default now()
);

alter table tasks
  add column if not exists subject text,
  add column if not exists topic text,
  add column if not exists priority text check (priority in ('low','medium','high')) default 'medium',
  add column if not exists estimated_duration integer;
