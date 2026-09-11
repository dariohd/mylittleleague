create extension if not exists pgcrypto;

create type public.match_status as enum ('scheduled', 'live', 'finished');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 24),
  title text not null default 'Rookie de la Faille',
  color text not null default '#C7F43D',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.competitions (
  id text primary key,
  name text not null,
  short_name text not null,
  color text not null default '#8B5CF6',
  source_page text,
  enabled boolean not null default true
);

create table public.teams (
  id text primary key,
  name text not null,
  short_name text not null,
  region text not null default 'INT',
  color text not null default '#C7F43D',
  source_name text unique,
  updated_at timestamptz not null default now()
);

create table public.matches (
  id text primary key,
  competition_id text not null references public.competitions(id),
  team_a_id text not null references public.teams(id),
  team_b_id text not null references public.teams(id),
  stage text not null default 'Saison régulière',
  starts_at timestamptz not null,
  best_of smallint not null check (best_of in (1, 3, 5)),
  score_a smallint check (score_a >= 0),
  score_b smallint check (score_b >= 0),
  status public.match_status not null default 'scheduled',
  source text not null default 'leaguepedia',
  source_url text,
  result_source text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (team_a_id <> team_b_id),
  check (
    (status <> 'finished') or
    (score_a is not null and score_b is not null and score_a <> score_b)
  )
);

create index matches_starts_at_idx on public.matches(starts_at);
create index matches_status_idx on public.matches(status);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members(user_id);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  winner_id text not null references public.teams(id),
  score_a smallint not null check (score_a >= 0),
  score_b smallint not null check (score_b >= 0),
  points smallint check (points between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id),
  check (score_a <> score_b)
);

create index predictions_match_idx on public.predictions(match_id);
create index predictions_user_idx on public.predictions(user_id);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid not null unique references public.predictions(id) on delete cascade,
  points smallint not null check (points between 0 and 5),
  reason text not null,
  created_at timestamptz not null default now()
);

create index point_events_user_idx on public.point_events(user_id);

create table public.rewards (
  id text primary key,
  name text not null,
  description text not null,
  threshold integer not null check (threshold > 0),
  accent text not null
);

create table public.user_rewards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id text not null references public.rewards(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

create table public.feed_cache (
  key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  status text not null default 'ok',
  error_message text
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)), 24)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group and user_id = auth.uid()
  );
$$;

create or replace function public.create_group(group_name text)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
  new_code text;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if char_length(trim(group_name)) not between 2 and 40 then raise exception 'Nom invalide'; end if;

  loop
    new_code := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 6));
    exit when not exists (select 1 from public.groups where code = new_code);
  end loop;

  insert into public.groups(name, code, owner_id)
  values (trim(group_name), new_code, auth.uid())
  returning id into new_group_id;

  insert into public.group_members(group_id, user_id)
  values (new_group_id, auth.uid());
  return new_code;
end;
$$;

create or replace function public.join_group(invite_code text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare target_group uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select id into target_group from public.groups where code = upper(trim(invite_code));
  if target_group is null then raise exception 'Code introuvable'; end if;
  insert into public.group_members(group_id, user_id)
  values (target_group, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.get_my_groups()
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(group_row order by group_row ->> 'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'code', g.code,
      'members', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'title', p.title,
          'color', p.color,
          'points', coalesce(stats.points, 0),
          'exactScores', coalesce(stats.exact_scores, 0),
          'streak', 0
        ) order by coalesce(stats.points, 0) desc), '[]'::jsonb)
        from public.group_members gm2
        join public.profiles p on p.id = gm2.user_id
        left join lateral (
          select
            coalesce(sum(pe.points), 0)::integer as points,
            count(*) filter (where pe.points = 5)::integer as exact_scores
          from public.point_events pe where pe.user_id = p.id
        ) stats on true
        where gm2.group_id = g.id
      )
    ) as group_row
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where gm.user_id = auth.uid()
  ) groups_for_user;
$$;

create or replace function public.get_my_stats()
returns jsonb
language sql
stable
security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'title', p.title,
    'color', p.color,
    'isAdmin', p.is_admin,
    'points', coalesce(sum(pe.points), 0),
    'exactScores', count(*) filter (where pe.points = 5),
    'streak', 0
  )
  from public.profiles p
  left join public.point_events pe on pe.user_id = p.id
  where p.id = auth.uid()
  group by p.id;
$$;

create or replace function public.validate_prediction()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target public.matches;
  wins_needed integer;
begin
  select * into target from public.matches where id = new.match_id;
  if target.id is null then raise exception 'Match introuvable'; end if;
  if target.status <> 'scheduled' or target.starts_at <= now() then raise exception 'Pronostics fermés'; end if;
  if new.winner_id not in (target.team_a_id, target.team_b_id) then raise exception 'Équipe invalide'; end if;

  wins_needed := ceil(target.best_of::numeric / 2);
  if greatest(new.score_a, new.score_b) <> wins_needed or least(new.score_a, new.score_b) >= wins_needed then
    raise exception 'Score invalide pour ce format';
  end if;
  if (new.score_a > new.score_b and new.winner_id <> target.team_a_id)
    or (new.score_b > new.score_a and new.winner_id <> target.team_b_id) then
    raise exception 'Le vainqueur ne correspond pas au score';
  end if;
  new.points := null;
  new.updated_at := now();
  return new;
end;
$$;

create trigger validate_prediction_before_write
  before insert or update of match_id, user_id, winner_id, score_a, score_b on public.predictions
  for each row execute procedure public.validate_prediction();

create or replace function public.score_finished_match()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare pred record;
declare awarded smallint;
begin
  if new.status <> 'finished' or new.score_a is null or new.score_b is null then return new; end if;

  for pred in select * from public.predictions where match_id = new.id loop
    awarded := case
      when pred.winner_id <> case when new.score_a > new.score_b then new.team_a_id else new.team_b_id end then 0
      when pred.score_a = new.score_a and pred.score_b = new.score_b then 5
      else 3
    end;

    update public.predictions set points = awarded where id = pred.id;
    insert into public.point_events(user_id, prediction_id, points, reason)
    values (pred.user_id, pred.id, awarded, case when awarded = 5 then 'score_exact' when awarded = 3 then 'vainqueur' else 'rate' end)
    on conflict (prediction_id) do update set points = excluded.points, reason = excluded.reason;

    insert into public.user_rewards(user_id, reward_id)
    select pred.user_id, r.id
    from public.rewards r
    where r.threshold <= (
      select coalesce(sum(points), 0) from public.point_events where user_id = pred.user_id
    )
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

create trigger score_match_after_result
  after insert or update of status, score_a, score_b on public.matches
  for each row execute procedure public.score_finished_match();

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.predictions enable row level security;
alter table public.point_events enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;
alter table public.feed_cache enable row level security;

create policy "profiles visible to signed users" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);
create policy "public competitions" on public.competitions for select using (true);
create policy "public teams" on public.teams for select using (true);
create policy "public matches" on public.matches for select using (true);
create policy "admins manage competitions" on public.competitions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage teams" on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage matches" on public.matches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members see their groups" on public.groups for select to authenticated using (public.is_group_member(id));
create policy "owners update groups" on public.groups for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members see memberships" on public.group_members for select to authenticated using (public.is_group_member(group_id));
create policy "users see own predictions" on public.predictions for select to authenticated using (user_id = auth.uid());
create policy "users insert own predictions" on public.predictions for insert to authenticated with check (user_id = auth.uid());
create policy "users update own predictions" on public.predictions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users see own points" on public.point_events for select to authenticated using (user_id = auth.uid());
create policy "public rewards" on public.rewards for select using (true);
create policy "users see own rewards" on public.user_rewards for select to authenticated using (user_id = auth.uid());

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.get_my_groups() to authenticated;
grant execute on function public.get_my_stats() to authenticated;

insert into public.competitions(id, name, short_name, color, source_page) values
  ('lec', 'League of Legends EMEA Championship', 'LEC', '#8B5CF6', 'LEC'),
  ('lck', 'League of Legends Champions Korea', 'LCK', '#56DDE8', 'LCK'),
  ('lta', 'League of Legends Championship of The Americas', 'LTA', '#FF6B6B', 'LTA'),
  ('lpl', 'League of Legends Pro League', 'LPL', '#F5C451', 'LPL');

insert into public.rewards(id, name, description, threshold, accent) values
  ('first-blood', 'Premier sang', 'Réussir son premier point', 1, '#FF6B6B'),
  ('not-random', 'Pas complètement random', 'Atteindre 25 points', 25, '#56DDE8'),
  ('sunday-oracle', 'Oracle du dimanche', 'Atteindre 40 points', 40, '#C7F43D'),
  ('galaxy-brain', 'Cerveau galactique', 'Atteindre 100 points', 100, '#8B5CF6');
