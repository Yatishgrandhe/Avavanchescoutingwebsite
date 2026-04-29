alter table public.users
add column if not exists can_edit_forms boolean default false;

update public.users
set can_edit_forms = true
where role in ('admin', 'superadmin')
  and can_edit_forms is distinct from true;
