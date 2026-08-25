-- DIA A DIA CONECTA - initial consolidated schema
-- This migration is prepared for review and must not be applied before approval.

create extension if not exists pgcrypto with schema extensions;

create type public.membership_role as enum ('admin', 'supervisor', 'consultant');
create type public.journey_status as enum ('aberta', 'finalizada', 'cancelada');
create type public.visit_outcome as enum (
  'lead_convertido',
  'recusou',
  'estabelecimento_fechado',
  'ja_possuia_cadastro',
  'outro'
);
create type public.visit_review_status as enum ('pendente', 'aprovada', 'suspeita', 'descartada');
create type public.lead_status as enum ('novo', 'voucher_reservado', 'voucher_entregue', 'cancelado');
create type public.voucher_status as enum ('disponivel', 'reservado', 'entregue', 'cancelado');
create type public.voucher_delivery_status as enum ('pendente', 'finalizada', 'cancelada');
create type public.voucher_ocr_status as enum ('pendente', 'processando', 'validado', 'reprovado', 'revisao_manual');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_name_not_blank check (length(btrim(name)) > 0),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_not_blank check (length(btrim(name)) > 0),
  constraint profiles_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_memberships_unique_user_role unique (tenant_id, user_id, role)
);

create unique index tenant_memberships_one_active_role_per_user_tenant
  on public.tenant_memberships (tenant_id, user_id)
  where active;

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  consultant_id uuid not null references public.profiles(id) on delete restrict,
  check_in_at timestamptz not null default now(),
  check_in_latitude numeric(9,6) not null,
  check_in_longitude numeric(9,6) not null,
  check_in_accuracy_meters numeric(10,2),
  check_out_at timestamptz,
  check_out_latitude numeric(9,6),
  check_out_longitude numeric(9,6),
  check_out_accuracy_meters numeric(10,2),
  status public.journey_status not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journeys_check_in_latitude_range check (check_in_latitude between -90 and 90),
  constraint journeys_check_in_longitude_range check (check_in_longitude between -180 and 180),
  constraint journeys_check_out_latitude_range check (check_out_latitude is null or check_out_latitude between -90 and 90),
  constraint journeys_check_out_longitude_range check (check_out_longitude is null or check_out_longitude between -180 and 180),
  constraint journeys_accuracy_positive check (
    (check_in_accuracy_meters is null or check_in_accuracy_meters > 0)
    and (check_out_accuracy_meters is null or check_out_accuracy_meters > 0)
  ),
  constraint journeys_checkout_after_checkin check (check_out_at is null or check_out_at >= check_in_at),
  constraint journeys_checkout_required_when_finished check (
    (status = 'aberta' and check_out_at is null)
    or (status in ('finalizada', 'cancelada') and check_out_at is not null)
  )
);

create unique index journeys_one_open_per_consultant_tenant
  on public.journeys (tenant_id, consultant_id)
  where status = 'aberta';

create table public.field_routes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  consultant_id uuid references public.profiles(id) on delete set null,
  route_date date not null,
  label text not null,
  city text,
  region text,
  instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_routes_label_not_blank check (length(btrim(label)) > 0)
);

create table public.visit_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  min_distance_signal_meters numeric(10,2) not null default 40,
  min_interval_signal_seconds integer not null default 180,
  max_gps_accuracy_meters numeric(10,2) not null default 50,
  photo_required boolean not null default true,
  hard_block_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_settings_positive_values check (
    min_distance_signal_meters > 0
    and min_interval_signal_seconds > 0
    and max_gps_accuracy_meters > 0
  )
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  consultant_id uuid not null references public.profiles(id) on delete restrict,
  journey_id uuid not null references public.journeys(id) on delete restrict,
  field_route_id uuid references public.field_routes(id) on delete set null,
  establishment_name text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  gps_accuracy_meters numeric(10,2),
  photo_path text,
  visited_at timestamptz not null default now(),
  outcome public.visit_outcome not null,
  previous_visit_id uuid references public.visits(id) on delete set null,
  distance_from_previous_meters numeric(10,2),
  seconds_from_previous integer,
  fraud_score numeric(5,2) not null default 0,
  fraud_signals jsonb not null default '{}'::jsonb,
  suspicious boolean not null default false,
  review_status public.visit_review_status not null default 'pendente',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_establishment_name_not_blank check (length(btrim(establishment_name)) > 0),
  constraint visits_latitude_range check (latitude between -90 and 90),
  constraint visits_longitude_range check (longitude between -180 and 180),
  constraint visits_accuracy_positive check (gps_accuracy_meters is null or gps_accuracy_meters > 0),
  constraint visits_distance_positive check (distance_from_previous_meters is null or distance_from_previous_meters >= 0),
  constraint visits_seconds_positive check (seconds_from_previous is null or seconds_from_previous >= 0),
  constraint visits_fraud_score_range check (fraud_score between 0 and 100),
  constraint visits_review_fields_consistent check (
    (review_status = 'pendente' and reviewed_by is null and reviewed_at is null)
    or (review_status <> 'pendente' and reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  consultant_id uuid not null references public.profiles(id) on delete restrict,
  visit_id uuid not null references public.visits(id) on delete restrict,
  establishment_name text not null,
  contact_name text not null,
  phone text not null,
  email text,
  document text,
  status public.lead_status not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_one_per_visit unique (visit_id),
  constraint leads_establishment_name_not_blank check (length(btrim(establishment_name)) > 0),
  constraint leads_contact_name_not_blank check (length(btrim(contact_name)) > 0),
  constraint leads_phone_not_blank check (length(btrim(phone)) > 0),
  constraint leads_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  code text not null,
  checksum_digit text,
  status public.voucher_status not null default 'disponivel',
  reserved_by uuid references public.profiles(id) on delete set null,
  reserved_for_lead_id uuid references public.leads(id) on delete set null,
  reserved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vouchers_code_not_blank check (length(btrim(code)) > 0),
  constraint vouchers_code_unique_per_tenant unique (tenant_id, code),
  constraint vouchers_reservation_consistent check (
    (status = 'disponivel' and reserved_by is null and reserved_for_lead_id is null and reserved_at is null and delivered_at is null)
    or (status = 'reservado' and reserved_by is not null and reserved_for_lead_id is not null and reserved_at is not null and delivered_at is null)
    or (status = 'entregue' and reserved_by is not null and reserved_for_lead_id is not null and reserved_at is not null and delivered_at is not null)
    or (status = 'cancelado')
  )
);

create table public.voucher_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  voucher_id uuid not null references public.vouchers(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  consultant_id uuid not null references public.profiles(id) on delete restrict,
  voucher_photo_path text not null,
  delivery_status public.voucher_delivery_status not null default 'pendente',
  finalized_by uuid references public.profiles(id) on delete set null,
  finalized_at timestamptz,
  ocr_status public.voucher_ocr_status not null default 'pendente',
  ocr_code_detected text,
  ocr_confidence numeric(5,2),
  ocr_model text,
  ocr_error text,
  ocr_error_message text,
  ocr_raw_response jsonb,
  ocr_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voucher_deliveries_photo_path_not_blank check (length(btrim(voucher_photo_path)) > 0),
  constraint voucher_deliveries_ocr_confidence_range check (ocr_confidence is null or ocr_confidence between 0 and 100),
  constraint voucher_deliveries_finalization_consistent check (
    (delivery_status = 'pendente' and finalized_by is null and finalized_at is null)
    or (delivery_status in ('finalizada', 'cancelada') and finalized_by is not null and finalized_at is not null)
  )
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_allowed check (
    event_type in (
      'journey_started',
      'journey_finished',
      'visit_recorded',
      'visit_reviewed',
      'lead_created',
      'voucher_reserved',
      'voucher_ocr_validated',
      'voucher_ocr_rejected',
      'voucher_ocr_manual_review',
      'voucher_delivery_finalized'
    )
  ),
  constraint audit_events_entity_type_not_blank check (length(btrim(entity_type)) > 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_tenant_memberships_updated_at before update on public.tenant_memberships for each row execute function public.set_updated_at();
create trigger set_journeys_updated_at before update on public.journeys for each row execute function public.set_updated_at();
create trigger set_field_routes_updated_at before update on public.field_routes for each row execute function public.set_updated_at();
create trigger set_visit_settings_updated_at before update on public.visit_settings for each row execute function public.set_updated_at();
create trigger set_visits_updated_at before update on public.visits for each row execute function public.set_updated_at();
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger set_vouchers_updated_at before update on public.vouchers for each row execute function public.set_updated_at();
create trigger set_voucher_deliveries_updated_at before update on public.voucher_deliveries for each row execute function public.set_updated_at();

create or replace function public.current_user_is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    join public.profiles p on p.id = tm.user_id
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.active
      and t.active
      and p.active
  );
$$;

create or replace function public.current_user_has_tenant_role(
  p_tenant_id uuid,
  p_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenants t on t.id = tm.tenant_id
    join public.profiles p on p.id = tm.user_id
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.role = any(p_roles)
      and tm.active
      and t.active
      and p.active
  );
$$;

create or replace function public.assert_current_user_tenant_role(
  p_tenant_id uuid,
  p_roles public.membership_role[]
)
returns public.membership_role
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role public.membership_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select tm.role
    into v_role
  from public.tenant_memberships tm
  join public.tenants t on t.id = tm.tenant_id
  join public.profiles p on p.id = tm.user_id
  where tm.tenant_id = p_tenant_id
    and tm.user_id = auth.uid()
    and tm.role = any(p_roles)
    and tm.active
    and t.active
    and p.active
  limit 1;

  if v_role is null then
    raise exception 'Insufficient tenant permission' using errcode = '42501';
  end if;

  return v_role;
end;
$$;

create or replace function public.log_audit_event(
  p_tenant_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit_id uuid;
begin
  insert into public.audit_events (
    tenant_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_tenant_id,
    p_actor_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$$;

create or replace function public.haversine_distance_meters(
  p_latitude_a numeric,
  p_longitude_a numeric,
  p_latitude_b numeric,
  p_longitude_b numeric
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select (
    6371000 * 2 * asin(
      sqrt(
        power(sin(radians((p_latitude_b - p_latitude_a)::double precision) / 2), 2)
        + cos(radians(p_latitude_a::double precision))
        * cos(radians(p_latitude_b::double precision))
        * power(sin(radians((p_longitude_b - p_longitude_a)::double precision) / 2), 2)
      )
    )
  )::numeric;
$$;

create or replace function public.start_journey(
  p_tenant_id uuid,
  p_check_in_latitude numeric,
  p_check_in_longitude numeric,
  p_check_in_accuracy_meters numeric default null,
  p_check_in_at timestamptz default now()
)
returns public.journeys
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_journey public.journeys;
begin
  perform public.assert_current_user_tenant_role(p_tenant_id, array['consultant']::public.membership_role[]);

  insert into public.journeys (
    tenant_id,
    consultant_id,
    check_in_at,
    check_in_latitude,
    check_in_longitude,
    check_in_accuracy_meters
  )
  values (
    p_tenant_id,
    auth.uid(),
    coalesce(p_check_in_at, now()),
    p_check_in_latitude,
    p_check_in_longitude,
    p_check_in_accuracy_meters
  )
  returning * into v_journey;

  perform public.log_audit_event(
    p_tenant_id,
    'journey_started',
    'journey',
    v_journey.id,
    jsonb_build_object('consultant_id', auth.uid())
  );

  return v_journey;
end;
$$;

create or replace function public.finish_journey(
  p_journey_id uuid,
  p_check_out_latitude numeric,
  p_check_out_longitude numeric,
  p_check_out_accuracy_meters numeric default null,
  p_check_out_at timestamptz default now()
)
returns public.journeys
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_journey public.journeys;
begin
  select *
    into v_journey
  from public.journeys
  where id = p_journey_id
    and consultant_id = auth.uid()
    and status = 'aberta'
  for update;

  if v_journey.id is null then
    raise exception 'Open journey not found for current user' using errcode = 'P0002';
  end if;

  perform public.assert_current_user_tenant_role(v_journey.tenant_id, array['consultant']::public.membership_role[]);

  update public.journeys
  set
    check_out_at = coalesce(p_check_out_at, now()),
    check_out_latitude = p_check_out_latitude,
    check_out_longitude = p_check_out_longitude,
    check_out_accuracy_meters = p_check_out_accuracy_meters,
    status = 'finalizada'
  where id = p_journey_id
  returning * into v_journey;

  perform public.log_audit_event(
    v_journey.tenant_id,
    'journey_finished',
    'journey',
    v_journey.id,
    jsonb_build_object('consultant_id', auth.uid())
  );

  return v_journey;
end;
$$;

create or replace function public.record_visit(
  p_tenant_id uuid,
  p_establishment_name text,
  p_latitude numeric,
  p_longitude numeric,
  p_gps_accuracy_meters numeric,
  p_photo_path text,
  p_outcome public.visit_outcome,
  p_field_route_id uuid default null,
  p_visited_at timestamptz default now()
)
returns public.visits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_journey public.journeys;
  v_previous public.visits;
  v_settings public.visit_settings;
  v_distance numeric(10,2);
  v_seconds integer;
  v_signals jsonb := '{}'::jsonb;
  v_score numeric(5,2) := 0;
  v_suspicious boolean := false;
  v_visit public.visits;
begin
  perform public.assert_current_user_tenant_role(p_tenant_id, array['consultant']::public.membership_role[]);

  select *
    into v_journey
  from public.journeys
  where tenant_id = p_tenant_id
    and consultant_id = auth.uid()
    and status = 'aberta'
  order by check_in_at desc
  limit 1
  for update;

  if v_journey.id is null then
    raise exception 'Open journey required to record visit' using errcode = '23514';
  end if;

  if p_field_route_id is not null and not exists (
    select 1
    from public.field_routes fr
    where fr.id = p_field_route_id
      and fr.tenant_id = p_tenant_id
      and (fr.consultant_id is null or fr.consultant_id = auth.uid())
      and fr.active
  ) then
    raise exception 'Invalid field route for tenant/consultant' using errcode = '23503';
  end if;

  select *
    into v_previous
  from public.visits
  where tenant_id = p_tenant_id
    and consultant_id = auth.uid()
  order by visited_at desc, created_at desc
  limit 1;

  select *
    into v_settings
  from public.visit_settings
  where tenant_id = p_tenant_id;

  if v_settings.tenant_id is null then
    v_settings.min_distance_signal_meters := 40;
    v_settings.min_interval_signal_seconds := 180;
    v_settings.max_gps_accuracy_meters := 50;
    v_settings.photo_required := true;
    v_settings.hard_block_enabled := false;
  end if;

  if v_previous.id is not null then
    v_distance := round(public.haversine_distance_meters(v_previous.latitude, v_previous.longitude, p_latitude, p_longitude), 2);
    v_seconds := greatest(0, extract(epoch from (coalesce(p_visited_at, now()) - v_previous.visited_at))::integer);

    if v_distance < v_settings.min_distance_signal_meters then
      v_score := v_score + 25;
      v_signals := v_signals || jsonb_build_object('short_distance', true);
    end if;

    if v_seconds < v_settings.min_interval_signal_seconds then
      v_score := v_score + 25;
      v_signals := v_signals || jsonb_build_object('short_interval', true);
    end if;
  end if;

  if p_gps_accuracy_meters is null or p_gps_accuracy_meters > v_settings.max_gps_accuracy_meters then
    v_score := v_score + 20;
    v_signals := v_signals || jsonb_build_object('low_gps_accuracy', true);
  end if;

  if v_settings.photo_required and nullif(btrim(coalesce(p_photo_path, '')), '') is null then
    v_score := v_score + 30;
    v_signals := v_signals || jsonb_build_object('missing_photo', true);
  end if;

  v_score := least(v_score, 100);
  v_suspicious := v_score >= 50;

  insert into public.visits (
    tenant_id,
    consultant_id,
    journey_id,
    field_route_id,
    establishment_name,
    latitude,
    longitude,
    gps_accuracy_meters,
    photo_path,
    visited_at,
    outcome,
    previous_visit_id,
    distance_from_previous_meters,
    seconds_from_previous,
    fraud_score,
    fraud_signals,
    suspicious
  )
  values (
    p_tenant_id,
    auth.uid(),
    v_journey.id,
    p_field_route_id,
    p_establishment_name,
    p_latitude,
    p_longitude,
    p_gps_accuracy_meters,
    nullif(btrim(coalesce(p_photo_path, '')), ''),
    coalesce(p_visited_at, now()),
    p_outcome,
    v_previous.id,
    v_distance,
    v_seconds,
    v_score,
    v_signals,
    v_suspicious
  )
  returning * into v_visit;

  perform public.log_audit_event(
    p_tenant_id,
    'visit_recorded',
    'visit',
    v_visit.id,
    jsonb_build_object(
      'consultant_id', auth.uid(),
      'fraud_score', v_score,
      'suspicious', v_suspicious
    )
  );

  return v_visit;
end;
$$;

create or replace function public.review_visit(
  p_visit_id uuid,
  p_review_status public.visit_review_status,
  p_review_notes text default null
)
returns public.visits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visit public.visits;
begin
  if p_review_status = 'pendente' then
    raise exception 'Review status must be final' using errcode = '23514';
  end if;

  select *
    into v_visit
  from public.visits
  where id = p_visit_id
  for update;

  if v_visit.id is null then
    raise exception 'Visit not found' using errcode = 'P0002';
  end if;

  perform public.assert_current_user_tenant_role(v_visit.tenant_id, array['admin', 'supervisor']::public.membership_role[]);

  update public.visits
  set
    review_status = p_review_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = p_review_notes,
    suspicious = (p_review_status = 'suspeita')
  where id = p_visit_id
  returning * into v_visit;

  perform public.log_audit_event(
    v_visit.tenant_id,
    'visit_reviewed',
    'visit',
    v_visit.id,
    jsonb_build_object('review_status', p_review_status, 'review_notes', p_review_notes)
  );

  return v_visit;
end;
$$;

create or replace function public.convert_visit_to_lead(
  p_visit_id uuid,
  p_contact_name text,
  p_phone text,
  p_email text default null,
  p_document text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visit public.visits;
  v_lead public.leads;
begin
  select *
    into v_visit
  from public.visits
  where id = p_visit_id
  for update;

  if v_visit.id is null then
    raise exception 'Visit not found' using errcode = 'P0002';
  end if;

  if v_visit.consultant_id <> auth.uid() then
    raise exception 'Only the visit consultant can convert this visit' using errcode = '42501';
  end if;

  perform public.assert_current_user_tenant_role(v_visit.tenant_id, array['consultant']::public.membership_role[]);

  insert into public.leads (
    tenant_id,
    consultant_id,
    visit_id,
    establishment_name,
    contact_name,
    phone,
    email,
    document
  )
  values (
    v_visit.tenant_id,
    v_visit.consultant_id,
    v_visit.id,
    v_visit.establishment_name,
    p_contact_name,
    p_phone,
    p_email,
    p_document
  )
  returning * into v_lead;

  update public.visits
  set outcome = 'lead_convertido'
  where id = v_visit.id
    and outcome <> 'lead_convertido';

  perform public.log_audit_event(
    v_visit.tenant_id,
    'lead_created',
    'lead',
    v_lead.id,
    jsonb_build_object('visit_id', v_visit.id, 'consultant_id', auth.uid())
  );

  return v_lead;
end;
$$;

create or replace function public.reserve_voucher(
  p_tenant_id uuid,
  p_lead_id uuid,
  p_voucher_id uuid default null
)
returns public.vouchers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads;
  v_voucher public.vouchers;
begin
  perform public.assert_current_user_tenant_role(p_tenant_id, array['consultant', 'supervisor', 'admin']::public.membership_role[]);

  select *
    into v_lead
  from public.leads
  where id = p_lead_id
    and tenant_id = p_tenant_id
  for update;

  if v_lead.id is null then
    raise exception 'Lead not found for tenant' using errcode = 'P0002';
  end if;

  if not public.current_user_has_tenant_role(p_tenant_id, array['admin', 'supervisor']::public.membership_role[])
     and v_lead.consultant_id <> auth.uid() then
    raise exception 'Consultant can reserve vouchers only for own leads' using errcode = '42501';
  end if;

  select *
    into v_voucher
  from public.vouchers
  where tenant_id = p_tenant_id
    and status = 'disponivel'
    and (p_voucher_id is null or id = p_voucher_id)
  order by created_at, id
  limit 1
  for update skip locked;

  if v_voucher.id is null then
    raise exception 'Available voucher not found' using errcode = 'P0002';
  end if;

  update public.vouchers
  set
    status = 'reservado',
    reserved_by = auth.uid(),
    reserved_for_lead_id = v_lead.id,
    reserved_at = now()
  where id = v_voucher.id
  returning * into v_voucher;

  update public.leads
  set status = 'voucher_reservado'
  where id = v_lead.id;

  perform public.log_audit_event(
    p_tenant_id,
    'voucher_reserved',
    'voucher',
    v_voucher.id,
    jsonb_build_object('lead_id', v_lead.id, 'reserved_by', auth.uid())
  );

  return v_voucher;
end;
$$;

create or replace function public.claim_voucher_ocr(p_delivery_id uuid)
returns setof public.voucher_deliveries
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.voucher_deliveries
  set ocr_status = 'processando'
  where id = p_delivery_id
    and ocr_status = 'pendente'
  returning *;
$$;

create or replace function public.register_voucher_ocr_result(
  p_delivery_id uuid,
  p_ocr_status public.voucher_ocr_status,
  p_ocr_code_detected text default null,
  p_ocr_confidence numeric default null,
  p_ocr_model text default null,
  p_ocr_error text default null,
  p_ocr_error_message text default null,
  p_ocr_raw_response jsonb default null,
  p_ocr_processed_at timestamptz default now()
)
returns public.voucher_deliveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery public.voucher_deliveries;
  v_expected_code text;
  v_expected_code_with_digit text;
  v_detected_code text;
  v_event_type text;
begin
  if p_ocr_status not in ('validado', 'reprovado', 'revisao_manual') then
    raise exception 'OCR result status must be final' using errcode = '23514';
  end if;

  select
    regexp_replace(upper(v.code), '[^A-Z0-9]', '', 'g'),
    regexp_replace(upper(v.code || coalesce(v.checksum_digit, '')), '[^A-Z0-9]', '', 'g')
    into v_expected_code, v_expected_code_with_digit
  from public.voucher_deliveries vd
  join public.vouchers v on v.id = vd.voucher_id
  where vd.id = p_delivery_id;

  if v_expected_code is null then
    raise exception 'Voucher delivery not found' using errcode = 'P0002';
  end if;

  v_detected_code := regexp_replace(upper(coalesce(p_ocr_code_detected, '')), '[^A-Z0-9]', '', 'g');

  if p_ocr_status = 'validado'
     and v_detected_code not in (v_expected_code, v_expected_code_with_digit) then
    raise exception 'Detected OCR code does not match voucher code' using errcode = '23514';
  end if;

  update public.voucher_deliveries
  set
    ocr_status = p_ocr_status,
    ocr_code_detected = p_ocr_code_detected,
    ocr_confidence = p_ocr_confidence,
    ocr_model = p_ocr_model,
    ocr_error = p_ocr_error,
    ocr_error_message = p_ocr_error_message,
    ocr_raw_response = p_ocr_raw_response,
    ocr_processed_at = coalesce(p_ocr_processed_at, now())
  where id = p_delivery_id
    and ocr_status in ('pendente', 'processando', 'revisao_manual')
  returning * into v_delivery;

  if v_delivery.id is null then
    raise exception 'Voucher delivery not found or OCR status cannot be updated' using errcode = 'P0002';
  end if;

  v_event_type := case p_ocr_status
    when 'validado' then 'voucher_ocr_validated'
    when 'reprovado' then 'voucher_ocr_rejected'
    else 'voucher_ocr_manual_review'
  end;

  perform public.log_audit_event(
    v_delivery.tenant_id,
    v_event_type,
    'voucher_delivery',
    v_delivery.id,
    jsonb_build_object(
      'ocr_status', p_ocr_status,
      'ocr_confidence', p_ocr_confidence,
      'ocr_model', p_ocr_model
    ),
    null
  );

  return v_delivery;
end;
$$;

create or replace function public.finalize_voucher_delivery(p_delivery_id uuid)
returns public.voucher_deliveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery public.voucher_deliveries;
  v_voucher public.vouchers;
  v_lead public.leads;
begin
  select *
    into v_delivery
  from public.voucher_deliveries
  where id = p_delivery_id
  for update;

  if v_delivery.id is null then
    raise exception 'Voucher delivery not found' using errcode = 'P0002';
  end if;

  perform public.assert_current_user_tenant_role(v_delivery.tenant_id, array['consultant', 'supervisor', 'admin']::public.membership_role[]);

  select *
    into v_voucher
  from public.vouchers
  where id = v_delivery.voucher_id
  for update;

  select *
    into v_lead
  from public.leads
  where id = v_delivery.lead_id
  for update;

  if v_voucher.id is null or v_lead.id is null then
    raise exception 'Voucher or lead not found' using errcode = 'P0002';
  end if;

  if v_delivery.ocr_status <> 'validado' then
    raise exception 'Voucher delivery OCR must be validado before finalization' using errcode = '23514';
  end if;

  if v_delivery.delivery_status <> 'pendente' then
    raise exception 'Voucher delivery is not pending' using errcode = '23514';
  end if;

  if v_voucher.tenant_id <> v_delivery.tenant_id
     or v_lead.tenant_id <> v_delivery.tenant_id
     or v_voucher.reserved_for_lead_id <> v_lead.id
     or v_voucher.status <> 'reservado' then
    raise exception 'Cross-tenant or reservation consistency violation' using errcode = '23514';
  end if;

  if not public.current_user_has_tenant_role(v_delivery.tenant_id, array['admin', 'supervisor']::public.membership_role[])
     and v_delivery.consultant_id <> auth.uid() then
    raise exception 'Consultant can finalize only own voucher deliveries' using errcode = '42501';
  end if;

  update public.voucher_deliveries
  set
    delivery_status = 'finalizada',
    finalized_by = auth.uid(),
    finalized_at = now()
  where id = v_delivery.id
  returning * into v_delivery;

  update public.vouchers
  set
    status = 'entregue',
    delivered_at = v_delivery.finalized_at
  where id = v_voucher.id;

  update public.leads
  set status = 'voucher_entregue'
  where id = v_lead.id;

  perform public.log_audit_event(
    v_delivery.tenant_id,
    'voucher_delivery_finalized',
    'voucher_delivery',
    v_delivery.id,
    jsonb_build_object('voucher_id', v_voucher.id, 'lead_id', v_lead.id)
  );

  return v_delivery;
end;
$$;

create index idx_tenant_memberships_user on public.tenant_memberships (user_id);
create index idx_tenant_memberships_tenant_role on public.tenant_memberships (tenant_id, role) where active;
create index idx_journeys_tenant_consultant_status on public.journeys (tenant_id, consultant_id, status);
create index idx_journeys_check_in_at on public.journeys (tenant_id, check_in_at desc);
create index idx_field_routes_tenant_consultant_date on public.field_routes (tenant_id, consultant_id, route_date);
create index idx_visits_tenant_consultant_visited_at on public.visits (tenant_id, consultant_id, visited_at desc);
create index idx_visits_journey on public.visits (journey_id);
create index idx_visits_field_route on public.visits (field_route_id);
create index idx_visits_review_queue on public.visits (tenant_id, review_status, suspicious, visited_at desc);
create index idx_leads_tenant_consultant_status on public.leads (tenant_id, consultant_id, status);
create index idx_leads_visit on public.leads (visit_id);
create index idx_vouchers_tenant_status on public.vouchers (tenant_id, status);
create index idx_vouchers_reserved_for_lead on public.vouchers (reserved_for_lead_id);
create index idx_voucher_deliveries_tenant_status on public.voucher_deliveries (tenant_id, delivery_status, created_at desc);
create index idx_voucher_deliveries_ocr_queue on public.voucher_deliveries (ocr_status, created_at) where ocr_status in ('pendente', 'processando', 'revisao_manual');
create index idx_voucher_deliveries_voucher on public.voucher_deliveries (voucher_id);
create index idx_voucher_deliveries_lead on public.voucher_deliveries (lead_id);
create unique index voucher_deliveries_one_active_per_voucher
  on public.voucher_deliveries (voucher_id)
  where delivery_status <> 'cancelada';
create unique index voucher_deliveries_one_active_per_lead
  on public.voucher_deliveries (lead_id)
  where delivery_status <> 'cancelada';
create index idx_audit_events_tenant_created_at on public.audit_events (tenant_id, created_at desc);
create index idx_audit_events_entity on public.audit_events (entity_type, entity_id);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.journeys enable row level security;
alter table public.field_routes enable row level security;
alter table public.visit_settings enable row level security;
alter table public.visits enable row level security;
alter table public.leads enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_deliveries enable row level security;
alter table public.audit_events enable row level security;

create policy tenants_select_members on public.tenants
  for select to authenticated
  using (public.current_user_is_tenant_member(id));

create policy profiles_select_self_or_same_tenant_admins on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.tenant_memberships viewer
      join public.tenant_memberships subject_membership on subject_membership.tenant_id = viewer.tenant_id
      where viewer.user_id = auth.uid()
        and viewer.role in ('admin', 'supervisor')
        and viewer.active
        and subject_membership.user_id = profiles.id
        and subject_membership.active
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy tenant_memberships_select_members on public.tenant_memberships
  for select to authenticated
  using (public.current_user_is_tenant_member(tenant_id));

create policy journeys_select_by_role on public.journeys
  for select to authenticated
  using (
    consultant_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[])
  );

create policy field_routes_select_by_role on public.field_routes
  for select to authenticated
  using (
    public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[])
    or consultant_id = auth.uid()
  );

create policy field_routes_manage_admin_supervisor on public.field_routes
  for all to authenticated
  using (public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[]))
  with check (public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[]));

create policy visit_settings_select_members on public.visit_settings
  for select to authenticated
  using (public.current_user_is_tenant_member(tenant_id));

create policy visit_settings_manage_admins on public.visit_settings
  for all to authenticated
  using (public.current_user_has_tenant_role(tenant_id, array['admin']::public.membership_role[]))
  with check (public.current_user_has_tenant_role(tenant_id, array['admin']::public.membership_role[]));

create policy visits_select_by_role on public.visits
  for select to authenticated
  using (
    consultant_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[])
  );

create policy leads_select_by_role on public.leads
  for select to authenticated
  using (
    consultant_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[])
  );

create policy vouchers_select_members on public.vouchers
  for select to authenticated
  using (public.current_user_is_tenant_member(tenant_id));

create policy voucher_deliveries_select_by_role on public.voucher_deliveries
  for select to authenticated
  using (
    consultant_id = auth.uid()
    or public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[])
  );

create policy audit_events_select_admin_supervisor on public.audit_events
  for select to authenticated
  using (public.current_user_has_tenant_role(tenant_id, array['admin', 'supervisor']::public.membership_role[]));

create or replace view public.vw_consultant_daily_funnel
with (security_invoker = true)
as
select
  v.tenant_id,
  v.consultant_id,
  p.name as consultant_name,
  v.visited_at::date as operation_date,
  count(v.id)::integer as visits,
  count(l.id)::integer as leads,
  count(vd.id)::integer as voucher_deliveries,
  case when count(v.id) = 0 then 0 else round((count(l.id)::numeric / count(v.id)::numeric) * 100, 2) end as conversion_rate,
  case when count(l.id) = 0 then 0 else round((count(vd.id) filter (where vd.delivery_status = 'finalizada')::numeric / count(l.id)::numeric) * 100, 2) end as delivery_rate
from public.visits v
join public.profiles p on p.id = v.consultant_id
left join public.leads l on l.visit_id = v.id
left join public.voucher_deliveries vd on vd.lead_id = l.id
group by v.tenant_id, v.consultant_id, p.name, v.visited_at::date;

create or replace view public.vw_supervisor_visit_review_queue
with (security_invoker = true)
as
select
  v.id,
  v.tenant_id,
  v.consultant_id,
  p.name as consultant_name,
  v.journey_id,
  v.establishment_name,
  v.latitude,
  v.longitude,
  v.gps_accuracy_meters,
  v.visited_at,
  v.outcome,
  v.distance_from_previous_meters,
  v.seconds_from_previous,
  v.fraud_score,
  v.fraud_signals,
  v.suspicious,
  v.review_status,
  v.created_at
from public.visits v
join public.profiles p on p.id = v.consultant_id
where v.review_status = 'pendente'
  and v.suspicious;

create or replace view public.vw_voucher_delivery_status
with (security_invoker = true)
as
select
  vd.id,
  vd.tenant_id,
  vd.voucher_id,
  vo.code as voucher_code,
  vo.checksum_digit,
  vo.status as voucher_status,
  vd.lead_id,
  l.establishment_name,
  vd.consultant_id,
  vd.delivery_status,
  vd.ocr_status,
  vd.ocr_code_detected,
  vd.ocr_confidence,
  vd.ocr_model,
  vd.ocr_processed_at,
  vd.created_at,
  vd.updated_at
from public.voucher_deliveries vd
join public.vouchers vo on vo.id = vd.voucher_id
join public.leads l on l.id = vd.lead_id;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('visit-photos', 'visit-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('voucher-photos', 'voucher-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy visit_photos_insert_own_tenant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visit-photos'
    and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, array['consultant']::public.membership_role[])
  );

create policy visit_photos_read_tenant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'visit-photos'
    and (
      public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor']::public.membership_role[])
      or owner = auth.uid()
    )
  );

create policy voucher_photos_insert_own_tenant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voucher-photos'
    and public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, array['consultant']::public.membership_role[])
  );

create policy voucher_photos_read_tenant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'voucher-photos'
    and (
      public.current_user_has_tenant_role(((storage.foldername(name))[1])::uuid, array['admin', 'supervisor']::public.membership_role[])
      or owner = auth.uid()
    )
  );

revoke execute on function public.current_user_is_tenant_member(uuid) from public;
revoke execute on function public.current_user_has_tenant_role(uuid, public.membership_role[]) from public;
revoke execute on function public.assert_current_user_tenant_role(uuid, public.membership_role[]) from public;
revoke execute on function public.log_audit_event(uuid, text, text, uuid, jsonb, uuid) from public;
revoke execute on function public.haversine_distance_meters(numeric, numeric, numeric, numeric) from public;
revoke execute on function public.start_journey(uuid, numeric, numeric, numeric, timestamptz) from public;
revoke execute on function public.finish_journey(uuid, numeric, numeric, numeric, timestamptz) from public;
revoke execute on function public.record_visit(uuid, text, numeric, numeric, numeric, text, public.visit_outcome, uuid, timestamptz) from public;
revoke execute on function public.review_visit(uuid, public.visit_review_status, text) from public;
revoke execute on function public.convert_visit_to_lead(uuid, text, text, text, text) from public;
revoke execute on function public.reserve_voucher(uuid, uuid, uuid) from public;
revoke execute on function public.claim_voucher_ocr(uuid) from public;
revoke execute on function public.register_voucher_ocr_result(uuid, public.voucher_ocr_status, text, numeric, text, text, text, jsonb, timestamptz) from public;
revoke execute on function public.finalize_voucher_delivery(uuid) from public;

grant execute on function public.current_user_is_tenant_member(uuid) to authenticated;
grant execute on function public.current_user_has_tenant_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.start_journey(uuid, numeric, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.finish_journey(uuid, numeric, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.record_visit(uuid, text, numeric, numeric, numeric, text, public.visit_outcome, uuid, timestamptz) to authenticated;
grant execute on function public.review_visit(uuid, public.visit_review_status, text) to authenticated;
grant execute on function public.convert_visit_to_lead(uuid, text, text, text, text) to authenticated;
grant execute on function public.reserve_voucher(uuid, uuid, uuid) to authenticated;
grant execute on function public.finalize_voucher_delivery(uuid) to authenticated;

grant execute on function public.claim_voucher_ocr(uuid) to service_role;
grant execute on function public.register_voucher_ocr_result(uuid, public.voucher_ocr_status, text, numeric, text, text, text, jsonb, timestamptz) to service_role;
