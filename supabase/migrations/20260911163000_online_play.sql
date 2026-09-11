-- Ligues manquantes + import calendrier pour les pronos en ligne.

insert into public.competitions(id, name, short_name, color, source_page) values
  ('worlds', 'Worlds', 'WORLDS', '#C7F43D', 'Worlds'),
  ('msi', 'MSI', 'MSI', '#56DDE8', 'MSI'),
  ('first-stand', 'First Stand', 'FS', '#F5C451', 'First Stand'),
  ('ewc', 'Esports World Cup', 'EWC', '#FF6B6B', 'EWC'),
  ('lck-cl', 'LCK Challengers', 'LCK CL', '#7DD3FC', 'LCK CL'),
  ('lcs', 'LCS', 'LCS', '#FF6B6B', 'LCS'),
  ('emea-masters', 'EMEA Masters', 'EM', '#C4B5FD', 'EMEA Masters'),
  ('lfl', 'LFL', 'LFL', '#60A5FA', 'LFL'),
  ('prime', 'Prime League', 'PRM', '#F97316', 'Prime League'),
  ('superliga', 'Superliga', 'SL', '#FB7185', 'Superliga'),
  ('nlc', 'NLC', 'NLC', '#34D399', 'NLC'),
  ('tcl', 'TCL', 'TCL', '#FBBF24', 'TCL'),
  ('pcs', 'PCS', 'PCS', '#22D3EE', 'PCS'),
  ('lcp', 'LCP', 'LCP', '#38BDF8', 'LCP'),
  ('vcs', 'VCS', 'VCS', '#4ADE80', 'VCS'),
  ('ljl', 'LJL', 'LJL', '#A78BFA', 'LJL'),
  ('cblol', 'CBLOL', 'CBLOL', '#F59E0B', 'CBLOL'),
  ('nacl', 'NACL', 'NACL', '#FB7185', 'NACL'),
  ('lrn', 'Liga Regional Norte', 'LRN', '#F97316', 'LRN'),
  ('lrs', 'Liga Regional Sur', 'LRS', '#F59E0B', 'LRS')
on conflict (id) do nothing;

create or replace function public.ensure_schedule(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  imported integer := 0;
  competition_id text;
  team_a jsonb;
  team_b jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'array' then
    return 0;
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    competition_id := nullif(item ->> 'competition_id', '');
    team_a := item -> 'team_a';
    team_b := item -> 'team_b';
    if competition_id is null or team_a is null or team_b is null then
      continue;
    end if;

    insert into public.competitions(id, name, short_name, color)
    values (
      competition_id,
      coalesce(nullif(item ->> 'competition_name', ''), competition_id),
      coalesce(nullif(item ->> 'competition_name', ''), competition_id),
      coalesce(nullif(item ->> 'competition_color', ''), '#8B5CF6')
    )
    on conflict (id) do nothing;

    insert into public.teams(id, name, short_name, region, color, source_name, updated_at)
    values (
      team_a ->> 'id',
      coalesce(team_a ->> 'name', team_a ->> 'id'),
      coalesce(team_a ->> 'short_name', left(team_a ->> 'name', 5)),
      coalesce(team_a ->> 'region', 'PRO'),
      coalesce(team_a ->> 'color', '#C7F43D'),
      coalesce(team_a ->> 'id', team_a ->> 'name'),
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      short_name = excluded.short_name,
      region = excluded.region,
      color = excluded.color,
      updated_at = now();

    insert into public.teams(id, name, short_name, region, color, source_name, updated_at)
    values (
      team_b ->> 'id',
      coalesce(team_b ->> 'name', team_b ->> 'id'),
      coalesce(team_b ->> 'short_name', left(team_b ->> 'name', 5)),
      coalesce(team_b ->> 'region', 'PRO'),
      coalesce(team_b ->> 'color', '#C7F43D'),
      coalesce(team_b ->> 'id', team_b ->> 'name'),
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      short_name = excluded.short_name,
      region = excluded.region,
      color = excluded.color,
      updated_at = now();

    insert into public.matches(
      id, competition_id, team_a_id, team_b_id, stage, starts_at, best_of,
      score_a, score_b, status, source, source_updated_at, updated_at
    )
    values (
      item ->> 'id',
      competition_id,
      team_a ->> 'id',
      team_b ->> 'id',
      coalesce(nullif(item ->> 'stage', ''), 'Saison régulière'),
      (item ->> 'starts_at')::timestamptz,
      coalesce((item ->> 'best_of')::smallint, 3),
      nullif(item ->> 'score_a', '')::smallint,
      nullif(item ->> 'score_b', '')::smallint,
      coalesce((item ->> 'status')::public.match_status, 'scheduled'),
      coalesce(nullif(item ->> 'source', ''), 'lolesports'),
      now(),
      now()
    )
    on conflict (id) do update set
      competition_id = excluded.competition_id,
      team_a_id = excluded.team_a_id,
      team_b_id = excluded.team_b_id,
      stage = excluded.stage,
      starts_at = excluded.starts_at,
      best_of = excluded.best_of,
      score_a = excluded.score_a,
      score_b = excluded.score_b,
      status = excluded.status,
      source_updated_at = now(),
      updated_at = now();

    imported := imported + 1;
  end loop;

  return imported;
end;
$$;

grant execute on function public.ensure_schedule(jsonb) to authenticated;
