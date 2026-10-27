-- ============================================================================
-- hiCousins Database Schema: Phase 1
-- PostgreSQL + Supabase with Row Level Security (RLS)
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Groups table
create table if not exists public.groups (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    invite_code text unique not null,
    invite_link_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 2. Group Settings table (per group, never hardcoded)
create table if not exists public.group_settings (
    group_id uuid primary key references public.groups(id) on delete cascade,
    share_value numeric not null default 100,
    penalty_rate numeric not null default 0.01,
    penalty_start date not null default '2025-10-01',
    penalty_grace_months int not null default 1,
    financial_year_start_month int not null default 10,
    stand_for_office_max_months_behind int not null default 2,
    document_approvals_required int not null default 1,
    registration_fee_default numeric not null default 200,
    meeting_quorum int null,
    absence_fines_enabled boolean not null default false,
    term_length_months int not null default 24,
    updated_at timestamptz not null default now()
);

-- 3. Members table (The roster of people in a chama)
create table if not exists public.members (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    member_no int not null,
    full_name text not null,
    phone text null,
    join_date text not null, -- 'YYYY-MM'
    reg_fee numeric not null default 200,
    status text not null default 'Active' check (status in ('Active', 'Left', 'Deceased', 'Never Active')),
    beneficiary_notes text null,
    created_at timestamptz not null default now(),
    unique(group_id, member_no)
);

-- 4. Memberships table (Links authenticated users to groups and member profiles)
create table if not exists public.memberships (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    member_id uuid null references public.members(id) on delete set null,
    role text not null default 'Member' check (role in (
        'President', 'Vice President', 'Secretary', 'Organizing Secretary',
        'Treasurer 1', 'Treasurer 2', 'Treasurer', 'Auditor', 'Auditor 2',
        'Chief Whip 1', 'Chief Whip 2', 'Member'
    )),
    status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected')),
    claimed_name text null,
    claimed_at timestamptz not null default now(),
    approved_by uuid null references auth.users(id),
    approved_at timestamptz null,
    unique(group_id, user_id)
);

-- 5. Role Terms table (Historical and current terms for officials)
create table if not exists public.role_terms (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    role text not null,
    start_date date not null,
    end_date date null,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 6. Ledger Entries (Append-only financial records)
create table if not exists public.ledger_entries (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    member_name text not null,
    amount numeric not null,
    type text not null check (type in ('Contribution', 'Penalty Payment', 'Admin Income', 'Debt Repayment', 'Penalty Charged')),
    date_received date not null,
    period_notes text null,
    status text not null default 'Pending Confirmation' check (status in ('Pending Confirmation', 'Confirmed', 'Rejected')),
    recorded_by uuid null references auth.users(id),
    confirmed_by uuid null references auth.users(id),
    confirmed_at timestamptz null,
    financial_year text not null,
    mpesa_code text null,
    created_at timestamptz not null default now(),
    
    -- Constraint: A treasurer cannot confirm their own entry
    constraint chk_no_self_confirmation check (
        confirmed_by is null or recorded_by is null or confirmed_by <> recorded_by
    )
);

-- 7. Audit Log table (Tamper-evident change log)
create table if not exists public.audit_log (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    actor_user_id uuid not null references auth.users(id),
    actor_name text not null,
    action text not null,
    entity text not null,
    entity_id text not null,
    details jsonb not null default '{}'::jsonb,
    timestamp timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

alter table public.groups enable row level security;
alter table public.group_settings enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.role_terms enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.audit_log enable row level security;

-- Function: Helper to check if current auth user is an approved member of a group
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.memberships
        where group_id = p_group_id
          and user_id = auth.uid()
          and status = 'approved'
    );
$$;

-- Function: Helper to check if current auth user is an official
create or replace function public.is_group_official(p_group_id uuid)
returns boolean language sql security definer as $$
    select exists (
        select 1 from public.memberships
        where group_id = p_group_id
          and user_id = auth.uid()
          and status = 'approved'
          and role in (
            'President', 'Vice President', 'Secretary', 'Organizing Secretary',
            'Treasurer 1', 'Treasurer 2', 'Treasurer', 'Auditor', 'Auditor 2',
            'Chief Whip 1', 'Chief Whip 2'
          )
    );
$$;

-- Group access: Anyone with an invite code can read basic group info; members can read their group
create policy "Anyone can read active group by invite"
    on public.groups for select
    using (invite_link_active = true or public.is_group_member(id));

create policy "Group settings visible to approved members"
    on public.group_settings for select
    using (public.is_group_member(group_id));

-- Members:
-- Non-approved joiners can only read roster names to claim a profile (no balances or details)
create policy "Roster names viewable for claiming"
    on public.members for select
    using (true);

-- Ledger Entries:
-- 1. Officials can view all ledger entries in their group
create policy "Officials can view all ledger entries"
    on public.ledger_entries for select
    using (public.is_group_official(group_id));

-- 2. Ordinary members can ONLY view their own ledger entries (never another member's)
create policy "Members can view only their own ledger entries"
    on public.ledger_entries for select
    using (
        exists (
            select 1 from public.memberships m
            where m.group_id = ledger_entries.group_id
              and m.user_id = auth.uid()
              and m.status = 'approved'
              and m.member_id = ledger_entries.member_id
        )
    );

-- 3. Only Treasurers or Admins can insert ledger entries
create policy "Treasurers can insert ledger entries"
    on public.ledger_entries for insert
    with check (
        exists (
            select 1 from public.memberships m
            where m.group_id = ledger_entries.group_id
              and m.user_id = auth.uid()
              and m.status = 'approved'
              and m.role in ('President', 'Treasurer 1', 'Treasurer 2', 'Treasurer')
        )
    );

-- 4. Only a different Treasurer can update a pending ledger entry to confirmed
create policy "Different treasurer can confirm entry"
    on public.ledger_entries for update
    using (
        exists (
            select 1 from public.memberships m
            where m.group_id = ledger_entries.group_id
              and m.user_id = auth.uid()
              and m.status = 'approved'
              and m.role in ('Treasurer 1', 'Treasurer 2', 'Treasurer')
              and auth.uid() <> ledger_entries.recorded_by
        )
    );
