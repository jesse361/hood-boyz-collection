-- Hood Boyz Collection commerce schema.
-- Monetary values are numeric, never floating point.
-- Row Level Security is forced on customer and operational tables.
-- Payment status changes are blocked unless the trusted server sets
-- app.payment_transition inside a transaction.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
end $$;

-- Local stand-in. On Supabase, auth.uid() already exists and is left untouched.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $fn$;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  avatar_url text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('customer', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('verify', 'reset')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  details text not null default '',
  materials text not null default '',
  care_instructions text not null default '',
  fit_notes text not null default '',
  base_price numeric(12, 2) not null check (base_price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  sku text not null unique,
  category_id uuid not null references public.categories(id),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  featured boolean not null default false,
  is_new boolean not null default false,
  is_limited_edition boolean not null default false,
  sample_data boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(sku, '')
    )
  ) stored
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  display_order integer not null default 0,
  is_primary boolean not null default false
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text not null,
  color text not null,
  color_code text,
  price_override numeric(12, 2) check (price_override is null or price_override >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  display_order integer not null default 0,
  primary key (collection_id, product_id)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  coupon_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner check (user_id is not null or session_id is not null)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now(),
  constraint wishlists_owner check (user_id is not null or session_id is not null)
);

create unique index if not exists wishlists_user_unique on public.wishlists (user_id) where user_id is not null;
create unique index if not exists wishlists_session_unique on public.wishlists (session_id) where session_id is not null;

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  first_name text not null,
  last_name text not null,
  phone text not null,
  country text not null,
  region text not null,
  city text not null,
  street text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  amount numeric(12, 2) not null check (amount >= 0),
  eta text not null default '',
  countries text[],
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount numeric(12, 2) check (maximum_discount is null or maximum_discount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automatic_discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount numeric(12, 2) check (maximum_discount is null or maximum_discount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.order_number_seq start 10001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  shipping_amount numeric(12, 2) not null default 0 check (shipping_amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency text not null default 'GHS',
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  fulfillment_status text not null default 'unfulfilled' check (
    fulfillment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  stock_state text not null default 'reserved' check (stock_state in ('reserved', 'committed', 'released')),
  shipping_address jsonb not null,
  billing_address jsonb,
  shipping_method text,
  shipping_method_id uuid references public.shipping_methods(id),
  payment_method text,
  coupon_code text,
  discount_name text,
  notes text,
  internal_notes text,
  idempotency_key text unique,
  access_token_hash text,
  expected_delivery text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  product_sku_snapshot text not null,
  variant_snapshot jsonb not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text not null default '',
  tracking_number text not null default '',
  notes text,
  shipped_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_reference text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'GHS',
  status text not null check (status in ('pending', 'success', 'failed', 'refunded')),
  verified_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_provider_reference_unique
  on public.payments (provider, provider_reference)
  where provider_reference is not null;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  comment text not null default '',
  is_verified_purchase boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  body text not null default '',
  image_url text,
  cta_text text not null default '',
  cta_link text not null default '',
  discount_label text,
  placement text not null default 'home_promo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  transaction_type text not null check (
    transaction_type in ('reservation', 'release', 'sale', 'adjustment', 'return')
  ),
  quantity integer not null,
  reference text,
  notes text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_search_idx on public.products using gin (search_vector);
create index if not exists product_images_product_idx on public.product_images (product_id, display_order);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists carts_user_idx on public.carts (user_id);
create index if not exists carts_session_idx on public.carts (session_id);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_email_idx on public.orders (lower(customer_email));
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists reviews_product_idx on public.reviews (product_id) where is_approved;
create index if not exists sessions_user_idx on public.sessions (user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists variants_updated_at on public.product_variants;
create trigger variants_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists carts_updated_at on public.carts;
create trigger carts_updated_at before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists coupons_updated_at on public.coupons;
create trigger coupons_updated_at before update on public.coupons
for each row execute function public.set_updated_at();

drop trigger if exists discounts_updated_at on public.automatic_discounts;
create trigger discounts_updated_at before update on public.automatic_discounts
for each row execute function public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists banners_updated_at on public.banners;
create trigger banners_updated_at before update on public.banners
for each row execute function public.set_updated_at();

drop trigger if exists addresses_updated_at on public.addresses;
create trigger addresses_updated_at before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists settings_updated_at on public.site_settings;
create trigger settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$fn$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
  );
$fn$;

create or replace function public.guard_order_payment()
returns trigger
language plpgsql
as $fn$
begin
  if new.payment_status is distinct from old.payment_status then
    if current_user not in ('postgres', 'supabase_admin', 'service_role')
       or current_setting('app.payment_transition', true) is distinct from 'on' then
      raise exception 'payment status is locked';
    end if;
  end if;
  if new.total_amount is distinct from old.total_amount
     or new.subtotal is distinct from old.subtotal
     or new.discount_amount is distinct from old.discount_amount
     or new.shipping_amount is distinct from old.shipping_amount
     or new.tax_amount is distinct from old.tax_amount then
    if current_setting('app.payment_transition', true) is distinct from 'on'
       and current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'order totals are locked';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists orders_guard_payment on public.orders;
create trigger orders_guard_payment
before update on public.orders
for each row execute function public.guard_order_payment();

create or replace function public.guard_user_roles()
returns trigger
language plpgsql
as $fn$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    raise exception 'only a super administrator can change roles';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'role ownership cannot be reassigned';
  end if;
  return new;
end;
$fn$;

drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard
before insert or update or delete on public.user_roles
for each row execute function public.guard_user_roles();

-- Supabase Auth profile sync. Skipped when auth.users is absent.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
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
            email_verified_at = excluded.email_verified_at;
      insert into public.user_roles (user_id, role)
      values (new.id, 'customer')
      on conflict do nothing;
      return new;
    end;
    $fn$;

    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.sessions enable row level security;
alter table public.sessions force row level security;
alter table public.email_tokens enable row level security;
alter table public.email_tokens force row level security;
alter table public.addresses enable row level security;
alter table public.addresses force row level security;
alter table public.carts enable row level security;
alter table public.carts force row level security;
alter table public.cart_items enable row level security;
alter table public.cart_items force row level security;
alter table public.wishlists enable row level security;
alter table public.wishlists force row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_items force row level security;
alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;
alter table public.order_events enable row level security;
alter table public.order_events force row level security;
alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.shipments enable row level security;
alter table public.shipments force row level security;
alter table public.reviews enable row level security;
alter table public.reviews force row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_subscribers force row level security;
alter table public.inventory_transactions enable row level security;
alter table public.inventory_transactions force row level security;
alter table public.contact_messages enable row level security;
alter table public.contact_messages force row level security;
alter table public.webhook_events enable row level security;
alter table public.webhook_events force row level security;
alter table public.coupons enable row level security;
alter table public.coupons force row level security;
alter table public.automatic_discounts enable row level security;
alter table public.automatic_discounts force row level security;
alter table public.products enable row level security;
alter table public.products force row level security;
alter table public.product_images enable row level security;
alter table public.product_images force row level security;
alter table public.product_variants enable row level security;
alter table public.product_variants force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.collections enable row level security;
alter table public.collections force row level security;
alter table public.collection_products enable row level security;
alter table public.collection_products force row level security;
alter table public.banners enable row level security;
alter table public.banners force row level security;
alter table public.site_settings enable row level security;
alter table public.site_settings force row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_methods force row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles
for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists roles_write on public.user_roles;
create policy roles_write on public.user_roles
for all using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists addresses_own on public.addresses;
create policy addresses_own on public.addresses
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products
for select using (status = 'active' or public.is_admin());

drop policy if exists products_write on public.products;
create policy products_write on public.products
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images
for select using (
  exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'active' or public.is_admin())
  )
);

drop policy if exists images_write on public.product_images;
create policy images_write on public.product_images
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants
for select using (
  exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'active' or public.is_admin())
  )
);

drop policy if exists variants_write on public.product_variants;
create policy variants_write on public.product_variants
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
for select using (is_active or public.is_admin());

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists collections_read on public.collections;
create policy collections_read on public.collections
for select using (is_active or public.is_admin());

drop policy if exists collections_write on public.collections;
create policy collections_write on public.collections
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists collection_products_read on public.collection_products;
create policy collection_products_read on public.collection_products
for select using (true);

drop policy if exists collection_products_write on public.collection_products;
create policy collection_products_write on public.collection_products
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners
for select using (is_active or public.is_admin());

drop policy if exists banners_write on public.banners;
create policy banners_write on public.banners
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists shipping_read on public.shipping_methods;
create policy shipping_read on public.shipping_methods
for select using (is_active or public.is_admin());

drop policy if exists shipping_write on public.shipping_methods;
create policy shipping_write on public.shipping_methods
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings
for select using (public.is_admin() or key not like 'internal_%');

drop policy if exists settings_write on public.site_settings;
create policy settings_write on public.site_settings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists discounts_admin on public.automatic_discounts;
create policy discounts_admin on public.automatic_discounts
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select using ((user_id is not null and user_id = auth.uid()) or public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.user_id is not null and o.user_id = auth.uid()) or public.is_admin())
  )
);

drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.user_id is not null and o.user_id = auth.uid()) or public.is_admin())
  )
);

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.user_id is not null and o.user_id = auth.uid()) or public.is_admin())
  )
);

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments
for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and ((o.user_id is not null and o.user_id = auth.uid()) or public.is_admin())
  )
);

drop policy if exists shipments_admin on public.shipments;
create policy shipments_admin on public.shipments
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
for select using (is_approved or user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
for insert with check (user_id = auth.uid() and is_approved = false);

drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews
for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists newsletter_insert on public.newsletter_subscribers;
create policy newsletter_insert on public.newsletter_subscribers
for insert with check (status = 'subscribed');

drop policy if exists newsletter_admin on public.newsletter_subscribers;
create policy newsletter_admin on public.newsletter_subscribers
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists inventory_admin on public.inventory_transactions;
create policy inventory_admin on public.inventory_transactions
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists messages_admin on public.contact_messages;
create policy messages_admin on public.contact_messages
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists webhooks_none on public.webhook_events;
create policy webhooks_none on public.webhook_events
for select using (public.is_super_admin());

drop policy if exists wishlists_own on public.wishlists;
create policy wishlists_own on public.wishlists
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists wishlist_items_own on public.wishlist_items;
create policy wishlist_items_own on public.wishlist_items
for all using (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_id and (w.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_id and (w.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists carts_own on public.carts;
create policy carts_own on public.carts
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists cart_items_own on public.cart_items;
create policy cart_items_own on public.cart_items
for all using (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin())
  )
);

-- Sessions and email tokens are server-only. No policies: default deny.

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.products, public.product_images, public.product_variants,
  public.categories, public.collections, public.collection_products,
  public.banners, public.shipping_methods
to anon, authenticated;

grant select on public.site_settings to anon, authenticated;
grant select, update (first_name, last_name, phone, avatar_url) on public.profiles to authenticated;
grant select (id, email, first_name, last_name, phone, avatar_url, email_verified_at, created_at, updated_at)
  on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.orders, public.order_items, public.order_events, public.payments, public.shipments to authenticated;
grant select, insert, delete on public.reviews to authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, insert, update, delete on public.wishlists, public.wishlist_items to authenticated;
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
