-- Trust Labs — Facebook Messenger AI agent state
-- Used by the messenger-webhook edge function. RLS is on with no policies:
-- only the service role (the edge function) can read or write these tables.

create table if not exists messenger_conversations (
  psid text primary key,                 -- page-scoped sender id
  handoff_at timestamptz,                -- set when a human took over; bot stays silent for a while
  handoff_reason text,
  updated_at timestamptz not null default now()
);
alter table messenger_conversations enable row level security;

create table if not exists messenger_messages (
  id bigserial primary key,
  psid text not null,
  mid text unique,                       -- Meta message id, used to drop webhook retries
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messenger_messages_psid_created_idx on messenger_messages (psid, created_at desc);
alter table messenger_messages enable row level security;
