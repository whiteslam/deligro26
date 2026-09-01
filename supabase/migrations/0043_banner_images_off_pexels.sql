-- 0014's four demo campaigns were seeded with images.pexels.com URLs — every
-- one of them a real, reachable photo (verified by hand), just not on a host
-- the CSP's img-src (next.config.ts) trusts. images.unsplash.com is the only
-- external photo host this app allows anywhere (see
-- scripts/migrate-images-to-unsplash.ts, which did this same move for
-- restaurants and menu items); banners were the one place that migration
-- never reached, so these four have sat broken in the admin console and the
-- customer home carousel ever since.
--
-- Matched by name AND the exact old Pexels URL, not by name alone: a
-- database where an operator already replaced one of these with their own
-- artwork must not have that edit overwritten by a migration re-run.
begin;

update public.banners set image_url =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&auto=format&fit=crop'
where name = 'Grocery launch'
  and image_url = 'https://images.pexels.com/photos/4198015/pexels-photo-4198015.jpeg?auto=compress&cs=tinysrgb&w=800';

update public.banners set image_url =
  'https://images.unsplash.com/photo-1572195577046-2f25894c06fc?w=800&q=80&auto=format&fit=crop'
where name = 'Pick & Drop'
  and image_url = 'https://images.pexels.com/photos/4391470/pexels-photo-4391470.jpeg?auto=compress&cs=tinysrgb&w=800';

update public.banners set image_url =
  'https://images.unsplash.com/photo-1577401132921-cb39bb0adcff?w=800&q=80&auto=format&fit=crop'
where name = 'Pharmacy'
  and image_url = 'https://images.pexels.com/photos/208512/pexels-photo-208512.jpeg?auto=compress&cs=tinysrgb&w=800';

update public.banners set image_url =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop'
where name = 'Burger Republic (paid)'
  and image_url = 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=800';

commit;
