-- ============================================================================
-- hiCousins Database Schema: Phase 2 & Phase 3
-- Section 1.5 Suggested Data Model Extension:
-- expenses, mmf_snapshots, documents, document_versions, document_approvals,
-- meetings, attendance, motions, ballots, turnout, cases, notices
-- ============================================================================

-- 8. Expenses table (Phase 2)
create table if not exists public.expenses (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    date date not null,
    category text not null check (category in ('Transaction Cost', 'Other Group Expenses')),
    description text not null,
    amount numeric not null check (amount > 0),
    authorized_by text not null,
    receipt_photo_url text null,
    status text not null default 'Pending Confirmation' check (status in ('Pending Confirmation', 'Confirmed', 'Rejected')),
    recorded_by uuid not null references auth.users(id),
    confirmed_by uuid null references auth.users(id),
    confirmed_at timestamptz null,
    rejection_reason text null,
    created_at timestamptz not null default now(),
    constraint chk_expense_no_self_confirmation check (
        confirmed_by is null or recorded_by is null or confirmed_by <> recorded_by
    )
);

-- 9. MMF Snapshots & Deposits (Phase 2)
create table if not exists public.mmf_deposits (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    deposit_date date not null,
    amount numeric not null check (amount > 0),
    source text not null check (source in ('Member Funds', 'Penalty Fines', 'Treasurer Debt Repayment')),
    confirmed_by uuid null references auth.users(id),
    reference_slip text null,
    created_at timestamptz not null default now()
);

create table if not exists public.mmf_snapshots (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    as_of_date date not null,
    total_deposited numeric not null,
    current_mmf_balance numeric not null,
    cumulative_interest numeric not null,
    cash_on_hand numeric not null,
    expected_mmf_balance numeric not null,
    discrepancy numeric not null,
    status text not null check (status in ('Balanced', 'Discrepancy')),
    recorded_by uuid not null references auth.users(id),
    created_at timestamptz not null default now()
);

-- 10. Documents, Versions, Approvals (Phase 2)
create table if not exists public.documents (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    title text not null,
    category text not null check (category in ('Constitution', 'Minutes', 'Audit Reports', 'MMF Statements', 'Other')),
    visibility text not null check (visibility in ('All members', 'Officials only')),
    current_version_number int not null default 1,
    released_version_number int null,
    status text not null default 'Pending approval' check (status in ('Draft', 'Pending approval', 'Released', 'Rejected')),
    uploaded_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    version_number int not null,
    file_name text not null,
    file_url text not null,
    change_summary text null,
    uploaded_by uuid not null references auth.users(id),
    status text not null default 'Pending approval' check (status in ('Draft', 'Pending approval', 'Released', 'Rejected')),
    created_at timestamptz not null default now(),
    unique(document_id, version_number)
);

create table if not exists public.document_approvals (
    id uuid primary key default uuid_generate_v4(),
    document_version_id uuid not null references public.document_versions(id) on delete cascade,
    official_user_id uuid not null references auth.users(id),
    action text not null check (action in ('Approved', 'Rejected')),
    reason text null,
    timestamp timestamptz not null default now()
);

-- 11. Meetings & Attendance (Phase 3)
create table if not exists public.meetings (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    title text not null,
    meeting_date timestamptz not null,
    agenda text not null,
    meeting_type text not null default 'Regular' check (meeting_type in ('Regular', 'AGM', 'Special', 'Committee')),
    minutes_doc_id uuid null references public.documents(id) on delete set null,
    status text not null default 'Scheduled' check (status in ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now()
);

create table if not exists public.attendance (
    id uuid primary key default uuid_generate_v4(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    status text not null check (status in ('Present', 'Absent', 'Apology', 'Late')),
    checked_in_at timestamptz null,
    checked_in_by uuid null references auth.users(id),
    notes text null,
    unique(meeting_id, member_id)
);

-- 12. Motions, Turnout, Ballots (Phase 3)
create table if not exists public.motions (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    title text not null,
    description text not null,
    motion_type text not null check (motion_type in ('General', 'Disbursement', 'Election', 'ConstitutionAmendment')),
    ballot_type text not null check (ballot_type in ('Secret', 'Open')),
    target_role text null,
    options jsonb not null default '[]'::jsonb,
    candidates jsonb null default '[]'::jsonb,
    returning_officer_id uuid not null references auth.users(id),
    status text not null default 'Draft' check (status in ('Draft', 'Open', 'Closed', 'Cancelled')),
    open_until timestamptz not null,
    closed_at timestamptz null,
    disbursement_amount numeric null,
    disbursement_beneficiary text null,
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now()
);

-- Turnout records WHO voted (immutable record of participation, zero choice linkage)
create table if not exists public.turnout (
    id uuid primary key default uuid_generate_v4(),
    motion_id uuid not null references public.motions(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    voted_at timestamptz not null default now(),
    unique(motion_id, member_id)
);

-- Ballots store the vote choices. In Secret ballots, voter_member_id is strictly null!
create table if not exists public.ballots (
    id uuid primary key default uuid_generate_v4(),
    motion_id uuid not null references public.motions(id) on delete cascade,
    choice text not null,
    voter_member_id uuid null references public.members(id) on delete set null,
    voted_at timestamptz not null default now()
);

-- 13. Welfare & Dispute Cases (Phase 3)
create table if not exists public.cases (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    case_number text not null,
    title text not null,
    reported_by_member_id uuid not null references public.members(id) on delete cascade,
    subject_member_id uuid null references public.members(id) on delete set null,
    category text not null check (category in ('Bereavement', 'Illness', 'Dispute', 'Financial Emergency', 'Other')),
    private_notes text not null,
    status text not null default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Closed')),
    priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
    assistance_amount numeric null,
    deletion_requested boolean not null default false,
    deletion_requested_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz null,
    unique(group_id, case_number)
);

-- Access audit log for private welfare cases (every view strictly logged)
create table if not exists public.case_view_logs (
    id uuid primary key default uuid_generate_v4(),
    case_id uuid not null references public.cases(id) on delete cascade,
    viewed_by_user_id uuid not null references auth.users(id),
    viewed_by_name text not null,
    viewed_role text not null,
    timestamp timestamptz not null default now()
);

-- 14. Notices & Announcements (Phase 3)
create table if not exists public.notices (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    title text not null,
    content text not null,
    category text not null check (category in ('Meeting', 'Arrears', 'Announcement', 'Election', 'General')),
    priority text not null default 'Normal' check (priority in ('Normal', 'Important', 'Urgent')),
    channels text[] not null default array['In-App'],
    target_audience text not null default 'All' check (target_audience in ('All', 'Arrears Only', 'Officials Only')),
    author_id uuid not null references auth.users(id),
    author_name text not null,
    published_at timestamptz not null default now(),
    expires_at timestamptz null
);

-- 15. Handover Log (Phase 3)
create table if not exists public.role_handovers (
    id uuid primary key default uuid_generate_v4(),
    group_id uuid not null references public.groups(id) on delete cascade,
    role text not null,
    previous_member_id uuid not null references public.members(id),
    new_member_id uuid not null references public.members(id),
    election_motion_id uuid not null references public.motions(id),
    handover_date timestamptz not null default now(),
    notes text null
);

-- Row-Level Security Enablement
alter table public.expenses enable row level security;
alter table public.mmf_deposits enable row level security;
alter table public.mmf_snapshots enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_approvals enable row level security;
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;
alter table public.motions enable row level security;
alter table public.turnout enable row level security;
alter table public.ballots enable row level security;
alter table public.cases enable row level security;
alter table public.case_view_logs enable row level security;
alter table public.notices enable row level security;
alter table public.role_handovers enable row level security;
