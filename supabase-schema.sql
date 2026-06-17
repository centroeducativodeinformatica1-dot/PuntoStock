-- ============================================================
-- PUNTOSTOCK — Schema Supabase
-- Ejecutar en: Dashboard → SQL Editor → New query
-- ============================================================

-- ── Extensiones ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Negocios ──────────────────────────────────────────────────
create table businesses (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  owner_name      text,
  owner_uid       uuid references auth.users(id) on delete cascade,
  email           text,
  phone           text,
  numero          int  default 1,
  tipo_negocio    text default 'otro',
  active          boolean default true,
  plan            text default 'trial',
  plan_solicitado text default 'trial',
  cantidad_negocios int default 1,
  trial_ends      timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Perfiles de usuario ───────────────────────────────────────
-- Extiende auth.users con datos de la app
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  business_id   uuid references businesses(id),
  business_ids  uuid[]  default '{}',
  name          text,
  email         text,
  phone         text,
  role          text    default 'owner',   -- 'owner' | 'admin'
  plan          text    default 'trial',
  cantidad_negocios int default 1,
  created_at    timestamptz default now()
);

-- ── Productos ─────────────────────────────────────────────────
create table productos (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  nombre       text not null,
  precio       numeric(14,2) default 0,
  costo        numeric(14,2) default 0,
  stock        int  default 0,
  stock_minimo int  default 0,
  categoria    text,
  codigo       text,
  vencimiento  date,
  activo       boolean default true,
  imagen_url   text,
  descripcion  text,
  peso         numeric(10,3),   -- para productos a granel
  es_peso      boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Ventas ────────────────────────────────────────────────────
create table ventas (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  items        jsonb not null default '[]',
  total        numeric(14,2) default 0,
  descuento    numeric(14,2) default 0,
  metodo_pago  text default 'efectivo',
  pagado_con   numeric(14,2),
  vuelto       numeric(14,2),
  empleada_id  uuid,
  nota         text,
  fecha        timestamptz default now()
);

-- ── Movimientos de stock ──────────────────────────────────────
create table movimientos (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  producto_id  uuid references productos(id) on delete set null,
  producto_nombre text,
  cantidad     int  not null,
  motivo       text,
  stock_antes  int,
  stock_despues int,
  fecha        timestamptz default now()
);

-- ── Clientes ─────────────────────────────────────────────────
create table clientes (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  nombre       text not null,
  telefono     text,
  email        text,
  direccion    text,
  notas        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Proveedores ───────────────────────────────────────────────
create table proveedores (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  nombre       text not null,
  telefono     text,
  email        text,
  direccion    text,
  notas        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Caja Fuerte ───────────────────────────────────────────────
create table caja_fuerte (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  monto        numeric(14,2) not null,
  tipo         text,   -- 'ingreso' | 'egreso'
  descripcion  text,
  timestamp    timestamptz default now()
);

-- ── Caja Registradora ─────────────────────────────────────────
create table caja_registradora (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  monto        numeric(14,2) not null,
  tipo         text,
  descripcion  text,
  timestamp    timestamptz default now()
);

-- ── Cierres de caja ───────────────────────────────────────────
create table cierres (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  datos        jsonb default '{}',
  fecha        timestamptz default now()
);

-- ── Empleadas ─────────────────────────────────────────────────
create table empleadas (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  nombre       text not null,
  activa       boolean default true,
  creada_en    timestamptz default now()
);

-- ── Consumos de empleadas ─────────────────────────────────────
create table empleada_consumos (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  empleada_id  uuid not null references empleadas(id) on delete cascade,
  descripcion  text,
  monto        numeric(14,2) default 0,
  fecha        timestamptz default now()
);

-- ── Anticipos de empleadas ────────────────────────────────────
create table empleada_anticipos (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  empleada_id  uuid not null references empleadas(id) on delete cascade,
  monto        numeric(14,2) not null,
  descripcion  text,
  fecha        timestamptz default now()
);

-- ── Cierres de empleadas ──────────────────────────────────────
create table empleada_cierres (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  empleada_id  uuid not null references empleadas(id) on delete cascade,
  datos        jsonb default '{}',
  pagado       boolean default true,
  cerrado_en   timestamptz default now()
);

-- ── Config del negocio ────────────────────────────────────────
create table config_negocio (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null unique references businesses(id) on delete cascade,
  datos        jsonb default '{}',
  updated_at   timestamptz default now()
);

-- ============================================================
-- RLS — Row Level Security
-- Cada negocio solo ve sus propios datos
-- ============================================================

alter table businesses          enable row level security;
alter table profiles            enable row level security;
alter table productos           enable row level security;
alter table ventas              enable row level security;
alter table movimientos         enable row level security;
alter table clientes            enable row level security;
alter table proveedores         enable row level security;
alter table caja_fuerte         enable row level security;
alter table caja_registradora   enable row level security;
alter table cierres             enable row level security;
alter table empleadas           enable row level security;
alter table empleada_consumos   enable row level security;
alter table empleada_anticipos  enable row level security;
alter table empleada_cierres    enable row level security;
alter table config_negocio      enable row level security;

-- Helper: obtiene los business_ids del usuario actual
create or replace function get_my_business_ids()
returns uuid[] language sql security definer stable as $$
  select coalesce(business_ids, array[business_id])
  from profiles
  where id = auth.uid()
$$;

-- Helper: verifica si el usuario es admin
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- ── Policies: profiles ────────────────────────────────────────
create policy "Perfil propio" on profiles
  for all using (id = auth.uid());

-- ── Policies: businesses ─────────────────────────────────────
create policy "Ver negocios propios" on businesses
  for select using (id = any(get_my_business_ids()) or is_admin());

create policy "Crear negocio" on businesses
  for insert with check (auth.uid() is not null);

create policy "Editar negocio propio" on businesses
  for update using (id = any(get_my_business_ids()) or is_admin());

create policy "Admin eliminar negocio" on businesses
  for delete using (is_admin());

-- ── Policy factory para tablas con business_id ────────────────
-- productos
create policy "Acceso productos" on productos
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- ventas
create policy "Acceso ventas" on ventas
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- movimientos
create policy "Acceso movimientos" on movimientos
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- clientes
create policy "Acceso clientes" on clientes
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- proveedores
create policy "Acceso proveedores" on proveedores
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- caja_fuerte
create policy "Acceso caja_fuerte" on caja_fuerte
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- caja_registradora
create policy "Acceso caja_registradora" on caja_registradora
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- cierres
create policy "Acceso cierres" on cierres
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- empleadas
create policy "Acceso empleadas" on empleadas
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- empleada_consumos
create policy "Acceso empleada_consumos" on empleada_consumos
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- empleada_anticipos
create policy "Acceso empleada_anticipos" on empleada_anticipos
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- empleada_cierres
create policy "Acceso empleada_cierres" on empleada_cierres
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- config_negocio
create policy "Acceso config" on config_negocio
  for all using (business_id = any(get_my_business_ids()) or is_admin());

-- ============================================================
-- Función atómica para decrementar stock
-- Evita race conditions en ventas concurrentes
-- ============================================================
create or replace function decrementar_stock(p_id uuid, p_cantidad int)
returns void language plpgsql security definer as $$
begin
  update productos
  set stock = stock - p_cantidad,
      updated_at = now()
  where id = p_id
    and stock >= p_cantidad;

  if not found then
    raise exception 'Stock insuficiente para el producto %', p_id;
  end if;
end;
$$;

-- ============================================================
-- Trigger: auto-crear profile cuando se registra un usuario
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Índices de performance
-- ============================================================
create index idx_productos_business   on productos(business_id);
create index idx_productos_activo     on productos(business_id, activo);
create index idx_productos_stock      on productos(business_id, stock);
create index idx_ventas_business      on ventas(business_id);
create index idx_ventas_fecha         on ventas(business_id, fecha desc);
create index idx_movimientos_business on movimientos(business_id);
create index idx_empleadas_business   on empleadas(business_id);
