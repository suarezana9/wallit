-- ==========================================
-- WALLIT — Schema completo
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- Tabla de usuarios (espejo del auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Tabla de grupos familiares
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ARS',
  created_by uuid references public.users(id) on delete set null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- Miembros del grupo
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Gastos
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (category in (
    'Supermercado', 'Servicios', 'Transporte', 'Salud',
    'Educación', 'Ocio', 'Restaurantes', 'Ropa', 'Tecnología', 'Otros'
  )),
  description text not null default '',
  date date not null default current_date,
  is_private boolean not null default false,
  receipt_url text,
  created_at timestamptz not null default now()
);

-- Presupuestos por categoría
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  category text not null,
  amount_limit numeric(12, 2) not null check (amount_limit > 0),
  month text not null, -- formato: '2025-01'
  created_at timestamptz not null default now(),
  unique(group_id, category, month)
);

-- División de gastos entre miembros
create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  amount numeric(12, 2) not null,
  settled boolean not null default false,
  unique(expense_id, user_id)
);

-- ==========================================
-- FUNCIÓN: crear usuario automáticamente al registrarse
-- ==========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.expense_splits enable row level security;

-- Users: cada uno ve y edita solo su perfil
create policy "usuarios_select" on public.users
  for select using (auth.uid() = id);

create policy "usuarios_update" on public.users
  for update using (auth.uid() = id);

-- Groups: solo miembros del grupo pueden verlo
create policy "grupos_select" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );

create policy "grupos_insert" on public.groups
  for insert with check (created_by = auth.uid());

create policy "grupos_update" on public.groups
  for update using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Group members: visible para miembros del mismo grupo
create policy "miembros_select" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "miembros_insert" on public.group_members
  for insert with check (user_id = auth.uid());

-- Expenses: miembros del grupo ven los gastos; gastos privados solo el dueño
create policy "gastos_select" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
    and (
      is_private = false or user_id = auth.uid()
    )
  );

create policy "gastos_insert" on public.expenses
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "gastos_update" on public.expenses
  for update using (user_id = auth.uid());

create policy "gastos_delete" on public.expenses
  for delete using (user_id = auth.uid());

-- Budgets: miembros del grupo
create policy "presupuestos_select" on public.budgets
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = auth.uid()
    )
  );

create policy "presupuestos_insert" on public.budgets
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = budgets.group_id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Expense splits: visibles para miembros del gasto
create policy "splits_select" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );
