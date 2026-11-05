-- Closes gaps found while reviewing the commerce schema:
-- one cart per owner, payment expiry, refunds, rate limits, slug redirects,
-- and a payment lock that does not depend on a hard-coded database username.

create unique index if not exists carts_user_unique
  on public.carts (user_id) where user_id is not null;

create unique index if not exists carts_session_unique
  on public.carts (session_id) where session_id is not null;

alter table public.orders
  add column if not exists payment_expires_at timestamptz;

alter table public.shipping_methods
  add column if not exists eligible_for_free_shipping boolean not null default false;

alter table public.coupons drop constraint if exists coupons_percentage_range;
alter table public.coupons
  add constraint coupons_percentage_range
  check (discount_type <> 'percentage' or discount_value <= 100);

alter table public.automatic_discounts drop constraint if exists automatic_discounts_percentage_range;
alter table public.automatic_discounts
  add constraint automatic_discounts_percentage_range
  check (discount_type <> 'percentage' or discount_value <= 100);

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  primary key (key, window_start)
);

create table if not exists public.redirects (
  from_path text primary key,
  to_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'GHS',
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  provider_reference text,
  reason text not null,
  method text not null check (method in ('provider', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists refunds_order_idx on public.refunds (order_id);

create or replace function public.guard_order_payment()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op = 'INSERT' and new.payment_status is distinct from 'pending' then
    if current_setting('app.payment_transition', true) is distinct from 'on' then
      raise exception 'orders are created with pending payment';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    new.payment_status is distinct from old.payment_status
    or new.subtotal is distinct from old.subtotal
    or new.discount_amount is distinct from old.discount_amount
    or new.shipping_amount is distinct from old.shipping_amount
    or new.tax_amount is distinct from old.tax_amount
    or new.total_amount is distinct from old.total_amount
    or new.currency is distinct from old.currency
    or new.order_number is distinct from old.order_number
  ) then
    if current_setting('app.payment_transition', true) is distinct from 'on' then
      raise exception 'payment status and order totals are locked';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists orders_guard_payment on public.orders;
create trigger orders_guard_payment
before insert or update on public.orders
for each row execute function public.guard_order_payment();

create or replace function public.guard_order_items()
returns trigger
language plpgsql
as $fn$
begin
  if tg_op <> 'INSERT' then
    raise exception 'order item snapshots are immutable';
  end if;
  return new;
end;
$fn$;

drop trigger if exists order_items_immutable on public.order_items;
create trigger order_items_immutable
before update or delete on public.order_items
for each row execute function public.guard_order_items();

create or replace function public.guard_user_roles()
returns trigger
language plpgsql
as $fn$
begin
  if current_setting('app.role_admin', true) = 'super_admin' then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT'
     and new.role = 'customer'
     and current_setting('app.allow_customer_role', true) = 'on' then
    return new;
  end if;
  if auth.uid() is not null and public.is_super_admin() then
    return coalesce(new, old);
  end if;
  raise exception 'only a super administrator can change roles';
end;
$fn$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, email, first_name, last_name, email_verified_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email_confirmed_at
  )
  on conflict (id) do update
    set email = excluded.email,
        email_verified_at = coalesce(excluded.email_verified_at, public.profiles.email_verified_at);
  perform set_config('app.allow_customer_role', 'on', true);
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;
  return new;
end;
$fn$;

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;
alter table public.redirects enable row level security;
alter table public.redirects force row level security;
alter table public.refunds enable row level security;
alter table public.refunds force row level security;

drop policy if exists redirects_read on public.redirects;
create policy redirects_read on public.redirects for select using (true);

drop policy if exists refunds_admin on public.refunds;
create policy refunds_admin on public.refunds
for all using (public.is_admin()) with check (public.is_admin());

grant select on public.redirects to anon, authenticated;
grant select on public.refunds to authenticated;

do $storage$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values
      ('product-images', 'product-images', true),
      ('collection-images', 'collection-images', true),
      ('campaign-images', 'campaign-images', true),
      ('brand-assets', 'brand-assets', true),
      ('customer-avatars', 'customer-avatars', false)
    on conflict (id) do nothing;
  end if;
end
$storage$;
