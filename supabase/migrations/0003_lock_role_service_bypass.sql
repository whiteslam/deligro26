-- Allow service-role scripts to assign roles (seed, admin tooling).
create or replace function public.lock_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and coalesce(auth.jwt() ->> 'role', '') not in ('service_role', 'supabase_admin') then
    raise exception 'role can only be changed by an admin';
  end if;
  return new;
end;
$$;
