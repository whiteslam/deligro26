-- ============================================================
-- Deligro — legacy catalog seed (generated)
-- ------------------------------------------------------------
-- Source: /home/gaurav-mirjha/deligro26/u231346219_deligro.json
-- Shops: 62 (bemetara) · generated 2026-07-09T15:48:29.624Z
--
-- Prereqs:
--   1. Run migrations 0001–0003
--   2. Run npm run db:seed-users (creates vendor@deligro.demo)
--   3. Paste this file into Supabase → SQL Editor → Run
--
-- Idempotent: upserts on restaurants.slug and
-- menu_items (restaurant_id, external_id).
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vendor@deligro.demo') THEN
    RAISE EXCEPTION 'Missing vendor user vendor@deligro.demo. Run npm run db:seed-users first.';
  END IF;
END $$;

-- Annpurna Resto food truck (legacy shop #20)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'annpurna-resto-food-truck-20',
    'Annpurna Resto food truck',
    'Chinese',
    false,
    true,
    'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Chinese'],
    2.5,
    22,
    20,
    30,
    2,
    204,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-188', 'Bombay Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-189', 'Masala Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-190', 'Veg Grilled Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-191', 'Chocolate Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-192', 'Cheese Corn Sandwich', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-193', 'Veg Cheese Sandwich', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-195', 'Paneer Cheese Sandwich', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-196', 'Annapurna Special Sandwich', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-199', 'Masala Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-200', 'Sechzwan Maggi', NULL, 70, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-202', 'Cheese Butter Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-203', 'Plain Maggi', NULL, 50, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-206', 'Paneer Chilli', 'full', 159, true, true, 'Veg Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-207', 'Chana Roast', NULL, 119, true, true, 'Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-209', 'Chana Chilli', NULL, 129, true, true, 'Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-211', 'Honey Chilli Potato', NULL, 139, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-213', 'Veg Fried Rice', NULL, 80, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-215', 'Sechzwan Fried Rice', NULL, 90, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-216', 'Paneer Fried RIce', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-219', 'Annapurna Special RIce', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-223', 'Special Chinese Pulao', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-225', 'Chole Bhature', NULL, 89, true, true, 'Veg Starters', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-227', 'French Fries', NULL, 60, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-228', 'Veg Chowmein', NULL, 70, true, true, 'Chowmein', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-230', 'Schezwan Chowmein', NULL, 80, true, true, 'Chowmein', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-231', 'Paneer Chowmein', NULL, 99, true, true, 'Chowmein', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-232', 'Manchurian', NULL, 120, true, true, 'Chowmein', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-234', 'Cheese Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-236', 'Aloo Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-237', 'Gobhi Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-239', 'Mix Veg Paratha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-241', 'Paneer Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-243', 'Plain Dosa', NULL, 40, true, true, 'Popular', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-244', 'Masala Dosa', NULL, 50, true, true, 'Popular', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-250', 'Onion Masala Dosa', NULL, 60, true, true, 'Popular', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-253', 'Paneer Masala Dosa', NULL, 70, true, true, 'Popular', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-260', 'Special Chowmein Burger', NULL, 60, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-261', 'Cheese Burger', NULL, 70, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-262', 'Veg Burger', NULL, 60, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-264', 'Paneer Burger', NULL, 70, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-265', 'Maxican Burger', NULL, 70, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-268', 'Fried Momos', NULL, 40, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-269', 'Chinese Pakoda', NULL, 40, true, true, 'Momos', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1350', 'Puri sabji', NULL, 45, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2801', 'Our Special Combo', '1. Momos – 1 plate (typically includes 6-8 pieces)   2. Chole Bhature – 1 plate (usually served with 2 bhature)   3. Veg Burger – 1 piece   4. French Fries – 1 plate (standard serving size)   5. Fried Rice – 1 plate', 301, true, true, 'Special Offer', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Rasoi restaurant (legacy shop #21)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'rasoi-restaurant-21',
    'Rasoi restaurant',
    'Indian Chinese',
    false,
    true,
    'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Chinese'],
    3.6,
    24,
    20,
    30,
    3,
    501,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-303', 'Veg Burger', NULL, 120, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-304', 'Cheese Burger', NULL, 140, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-306', 'Mushroom Pizza', NULL, 230, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-308', 'Onion Pizza', NULL, 219, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-309', 'Cheese Pizza', NULL, 140, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-310', 'Maxican Pizza', NULL, 240, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-317', 'Paneer Chilli', NULL, 250, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-319', 'Baby Corn Chilli', NULL, 260, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-320', 'Lovely Corn', NULL, 250, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-321', 'Baby Corn Mushroom Chilli', NULL, 280, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-323', 'Chana Chilli', NULL, 230, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-324', 'Mushroom Chilli', NULL, 260, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-325', 'Paneer 65', NULL, 290, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-326', 'Veg Crispy', NULL, 220, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-328', 'Veg Lolipop', NULL, 290, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-329', 'Veg Chowmein', NULL, 210, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-330', 'Veg Hakka Noodels', NULL, 230, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-331', 'Veg SIngapuri Noodels', NULL, 260, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-332', 'Paneer Stick', NULL, 280, true, true, 'Chinese', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-333', 'Poha', NULL, 50, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-334', 'Chana Roast', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-335', 'Chole Bhature', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-336', 'Aloo Paratha', 'With Curd (Dahi)', 100, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-337', 'Gobhi Paratha', 'With Curd (Dahi)', 100, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-338', 'Onion Paratha', 'With Curd (Dahi)', 100, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-339', 'Idly Sambhar', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-340', 'Finger Chips', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-341', 'Upma', NULL, 79, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-342', 'Onion Uttapam', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-343', 'Tomato Uttapam', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-344', 'Plain Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-345', 'Cheese Masala Dosa', NULL, 140, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-346', 'Mysore Masala Dosa', NULL, 160, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-347', 'Rasoi Special Dosa', NULL, 160, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-348', 'Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-349', 'Veg Sandwich', NULL, 110, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-350', 'Cheese Sandwich', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-351', 'Veg Grilled Cheese Sandwich', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-352', 'Veg Club Green Sandwich', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-353', 'Cheese Corn Sandwich', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-354', 'Veg Cutlet', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-355', 'Plain Curd`', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-356', 'Veg Raita', NULL, 130, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-357', 'Boondi Raita', NULL, 130, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-358', 'Onion Raita', NULL, 110, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-359', 'Pineapple Raita', NULL, 160, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-360', 'Fruit Raita', NULL, 170, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-361', 'Aloo Gobhi', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-362', 'Baigan Bharta', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-363', 'Aloo Jeera', NULL, 210, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-364', 'Mix Veg', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-365', 'Chana Masala', NULL, 199, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-366', 'Crispy Karela', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-367', 'Aloo Matar', NULL, 189, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-368', 'Gobhi Matar', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-369', 'Stuffed Tomato', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-370', 'Veg Kofta', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-371', 'Aloo Dum Kashmiri', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-372', 'Aloo Dum Punjabi', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-373', 'Palak Corn', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-374', 'Veg Kolhapuri', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-375', 'Malai Kofta', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-377', 'Veg Angoori Kofta', NULL, 270, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-378', 'Mashroom Masala', NULL, 229, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-379', 'Mashroom Kolhapuri', NULL, 290, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-380', 'Veg Jaipuri', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-381', 'Veg Patiyala', NULL, 290, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-382', 'Veg Keema Kasturi', NULL, 290, false, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-383', 'Panner Kolhapuri', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-384', 'Veg Handi', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-385', 'Veg Jalfrezi', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-386', 'Tomato Chatni', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-387', 'Bhindi Masala', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-388', 'Mashroom Handi', NULL, 259, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-389', 'Mashroom Butter Masala', NULL, 229, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-390', 'Mashroom Corn Masala', NULL, 229, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-391', 'Mashroom Tikka Masala', NULL, 310, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-392', 'Bhindi Fry', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-393', 'Bhindi Do Pyaja', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-394', 'Baby Corn Masala', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-395', 'Baby Corn Palak', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-397', 'Rasoi Chef Special', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-398', 'Tandoori Roti', NULL, 20, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-399', 'Butter Tandoori Roti', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-400', 'Plain Naan', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-401', 'Butter Naan', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-402', 'Garlic Naan', NULL, 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-403', 'Missi Roti', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-404', 'Lachha Paratha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-405', 'Plain Kulcha', NULL, 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-406', 'Masala Kulcha', NULL, 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-407', 'Shahi Paneer', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-408', 'Paneer Handi', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-409', 'Paneer Butter Masala', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-410', 'Palak Paneer', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-411', 'Paneer Kadhai', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-412', 'Paneer Korma', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-414', 'Paneer Navratan Korma', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-415', 'Paneer Lababdar', NULL, 340, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-416', 'Paneer Bhurji', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-417', 'Mashroom Paneer Masala', NULL, 289, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-418', 'Paneer Hydrabadi', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-419', 'Paneer Achari Masala', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-421', 'Paneer Kofta', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-422', 'Paneer Punjab Di Kali', NULL, 360, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-423', 'Paneer Do Pyaja', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-425', 'Paneer Tikka Masala', NULL, 380, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-426', 'Dingri Dolma', NULL, 290, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-427', 'Hot Gulab Jamun', '2 Piece of Gulab Jamun', 60, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-428', 'Rashgulla', '2 Piece of Rashgulla', 60, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-429', 'Raj Bhog', '2 Piece of Raj Bhog', 70, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-430', 'Gulab Jamun with Icecream', 'With Ice Cream', 140, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-431', 'Plain Dal', NULL, 119, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-432', 'Jeera Dal Fry', NULL, 129, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-433', 'Dal Fry', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-434', 'Dal Tadka', NULL, 159, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-436', 'Dal Kolhapuri', NULL, 179, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-437', 'Dal Punjabi', NULL, 189, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-440', 'Dhabe Di Dal', NULL, 209, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-441', 'Steamed RIce', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-442', 'Jeera Rice', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-443', 'Onion Tomato Jeera RIce', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-444', 'Green Peas Pulao', NULL, 169, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-445', 'Veg Pulao', NULL, 190, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-446', 'Masala RIce', NULL, 220, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-447', 'Paneer Pulao', NULL, 220, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-448', 'Kashmiri Pulao', NULL, 220, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-449', 'Sahi Pulao', NULL, 199, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-450', 'Dal Khichadi', NULL, 190, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-451', 'Butter Dal Khichadi', NULL, 200, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-452', 'Veg Biryani', NULL, 240, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-453', 'Veg Hydrabadi Biryani', NULL, 250, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-454', 'Lemon Rice', NULL, 190, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-455', 'Curd RIce', NULL, 190, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-456', 'Matka Biryani', NULL, 280, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-457', 'Hara Bhara Kabab', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-458', 'Veg Seek Kabab', NULL, 260, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-459', 'Corn Kabab', NULL, 260, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-460', 'Paneer Tikka', NULL, 270, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-461', 'Paneer Malai Tikka', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-462', 'Paneer Pudina Tikka', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-463', 'Paneer Reshmi Tikka', NULL, 289, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-464', 'Paneer Achari Tikka', NULL, 310, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-465', 'Paneer Pahadi Tikka', NULL, 320, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-466', 'Paneer Laziz Tikka', NULL, 330, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-467', 'Papad Dry', NULL, 40, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-468', 'Papad Fry', NULL, 50, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-470', 'Onion Salad', NULL, 70, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-471', 'Green Salad', NULL, 90, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-472', 'Cucumber Salad', NULL, 90, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-473', 'Family Salad', NULL, 130, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2703', 'Special Shigdi Dosa', NULL, 160, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3007', 'Manchurian', NULL, 220, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4597', 'Tea', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4598', 'Hot Coffee', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4599', 'Shikanji', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4600', 'Fresh Lime Soda', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4601', 'Masala Cold Drink', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4602', 'Lassi', NULL, 60, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4603', 'Butter MIlk', NULL, 60, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4604', 'Cold Coffee', NULL, 130, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4605', 'Cold Coffee with Icecream', NULL, 150, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4606', 'Brownie Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4607', 'Badam Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4608', 'Oreo Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4609', 'Chocolate Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4610', 'Strawberry Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4611', 'Virgin Mojito', NULL, 130, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4612', 'Mint Mojito', NULL, 130, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4613', 'Blue Lagoon', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4614', 'Dilruba Melon Shake', NULL, 160, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4615', 'Tomato Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4616', 'Veg Clear Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4617', 'Lemon Coriander Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4618', 'Hot N Sour Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4619', 'Manchow Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4620', 'Cream of Mushroom Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4621', 'Cream of Spinach Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4622', 'Sweet Corn Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4623', 'Paneer Masala Dosa', NULL, 140, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4624', 'Cutting Masala Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4625', 'Paneer Paratha', NULL, 130, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4626', 'Peanut Masala', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4627', 'Peri Peri Fries', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4628', 'Onion Pakoda', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4629', 'Mix Veg Pakoda', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4630', 'Paneer Pakoda', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4631', 'Red Sauce Pasta', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4632', 'White Sauce Pasta', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4633', 'Plain Maggie', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4634', 'Masala Maggie', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4635', 'Soya Tandoori Tikka', NULL, 290, true, true, 'Soya Chap', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4636', 'Soya Haryali Tikka', NULL, 290, true, true, 'Soya Chap', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4637', 'Soya Tikka Roll', NULL, 290, true, true, 'Soya Chap', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4638', 'Soya Tikka Masala', NULL, 380, true, true, 'Soya Chap', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4639', 'Soya Matka Biryani', NULL, 330, true, true, 'Soya Chap', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4640', 'Chilly Garlic Noodles', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4641', 'Veg Fried Rice', NULL, 240, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4642', 'Veg Schezwan Fried Rice', NULL, 260, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4643', 'Triple Schezwan Rice', NULL, 380, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4644', 'Chinese Bhel', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4645', 'Corn Chilli', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4646', 'Corn Crispy', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4647', 'Baby Corn Crispy', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4648', 'American Corn Salt & Pepper', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4649', 'Veg Crunchy', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4650', 'Paneer Dragon', NULL, 280, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4651', 'Paneer Kurkuri', NULL, 280, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4652', 'Paneer Mangolian', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4653', 'Veg Bullet', NULL, 265, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4654', 'Paneer Red Cock', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4655', 'Masala Papad Fry', NULL, 70, true, true, 'Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4656', 'Dahi Ke Sholey', NULL, 260, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4657', 'Mushroom Tikka', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4658', 'Sunahari Kabab', NULL, 290, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4659', 'Methi Matar Malai', NULL, 310, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4660', 'Paneer Masala', NULL, 280, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4661', 'Matar Paneer', NULL, 280, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4662', 'Paneer Chatpata', NULL, 320, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Dilip Biryani (legacy shop #23)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'dilip-biryani-23',
    'Dilip Biryani',
    'Chicken Biryani',
    false,
    true,
    'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Biryani'],
    4.2,
    32,
    20,
    30,
    2,
    276,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-42', 'Chicken Biryani', 'Chicken Biryani includes 2 Pieces of Chicken, Raita, Gravy, Salad.', 130, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-43', 'Chicken Gravy', 'Chicken Gravy Half Plate including 4-5 piece of Chicken.', 90, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-44', 'Fish Curry', 'Half Plate of Fish Curry Including 3 pieces of Fish', 90, false, true, 'Fish', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-45', 'Egg Curry', 'Egg Curry Includes 2 Pieces of Egg.', 70, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-46', 'Chicken Pakoda', 'Half Plate Chicken Pakoda', 70, false, true, 'Fried Item', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-47', 'Chicken Kadi', 'One Stick of Chicken Kadi with Mint Sauce.', 45, false, true, 'Fried Item', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-49', 'Chicken Leg Piece', 'Chicken Leg Piece comes with Full Chicken Leg.', 100, false, true, 'Fried Item', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-50', 'Special Chicken Kadai', 'Dilip Special Chicken Kadai comes with 1 Full Kg of Chicken.', 420, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-51', 'Plain RIce', 'Full Plate of Plain Rice.', 60, true, true, 'Rice', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-1390', 'Chicken Lolipop', NULL, 80, false, true, 'Fried Item', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2692', 'Chicken Pota Kaleji', NULL, 80, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3066', 'Egg Biryani', NULL, 90, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Gupta Sweets and Dosa Corner (legacy shop #24)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'gupta-sweets-and-dosa-corner-24',
    'Gupta Sweets and Dosa Corner',
    'Samosa',
    false,
    true,
    'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['South Indian'],
    3.7,
    7,
    20,
    30,
    2,
    207,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-54', 'Plain Dosa', 'Plain Dosa', 40, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-55', 'Masala Dosa', 'Masala Dosa filled with mashed potatoes comes with Sambhar and Chutney.', 45, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-56', 'Cutting Dosa', 'Cutting Dosa', 60, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-57', 'Idli Sambhar', '3 Piece of Idli come with Sambhar.', 35, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-58', 'Sambhar Vada', 'Sambhar Vada 2 Piece.', 40, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-59', 'Kachori', 'Kachori 2 Piece with Chutney.', 28, true, true, 'Snacks', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-60', 'Samosa', 'Samosa 2 Piece with Chutney', 28, true, true, 'Samosa', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-61', 'Aaloo Gunda', 'Aaloo Gunda 2 Piece with Chutney.', 28, true, true, 'Snacks', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-62', 'Bread Pakoda', 'Bread Pakoda 2 Piece with Chutney.', 28, true, true, 'Snacks', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-63', 'Pyaji Vada', 'Pyaji Vada 2 Piece with Chutney.', 28, true, true, 'Snacks', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-64', 'Dahi Samosa', 'Dahi Samosa 2 Piece', 45, true, true, 'Samosa', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-65', 'Dahi Aaloo Gunda', 'Dahi Aaloo Gunda', 45, true, true, 'Snacks', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-1193', 'Gulab Jamun', NULL, 90, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1194', 'Kalakand', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1195', 'Peda', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1196', 'Mathura Peda', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1197', 'Kaju Katli', NULL, 250, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1198', 'Kaju Bite', NULL, 280, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1199', 'Chocolate Barfi', NULL, 120, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1201', 'Magaj Laddu', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1203', 'Milk Cake', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1205', 'Milk Bite', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Bobby Da Dhaba (legacy shop #25)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'bobby-da-dhaba-25',
    'Bobby Da Dhaba',
    'Chicken and Mutton',
    false,
    true,
    'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    1.7,
    6,
    20,
    30,
    2,
    328,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-79', 'Green Salad', 'Green Salad', 60, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-80', 'Onion Salad', 'Onion Salad', 20, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-81', 'Kachumber Salad', 'Kachumber Salad', 80, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-82', 'Peanut Salad', 'Peanut Salad', 100, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-83', 'Padad Dry', 'Padad Dry', 15, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-84', 'Papad Fry', 'Papad Fry', 20, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-85', 'Masala Papad', 'Masala Papad', 30, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-86', 'Paneer Chilli', 'Paneer Chilli', 180, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-88', 'Finger Chips/ French Fries', 'Finger Chips/ French Fries', 90, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-89', 'Paneer Roast', 'Paneer Roast', 160, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-91', 'Chana Roast', 'Chana Roast', 160, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-92', 'Chana Chilli', 'Chana Chilli', 160, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-93', 'Paneer Pakoda', 'Paneer Pakoda', 160, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-94', 'Chicken Chilli', 'Chicken Chilli', 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-95', 'Chicken Chilli', 'Chicken Chilli', 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-96', 'Chicken Roast', 'Chicken Roast', 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-97', 'Chicken Roast', 'Chicken Roast', 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-98', 'Chicken Tandoori', 'Chicken Tandoori', 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-99', 'Fish Roast', 'Fish Roast', 180, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-100', 'Fish Fry', 'Fish Fry', 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-101', 'Egg Chilli', 'Egg Chilli', 160, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-102', 'Tandoori Roti', 'Tandoori Roti', 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-103', 'Butter Tandoori Roti', 'Butter Tandoori Roti', 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-104', 'Tawa Roti', 'Tawa Roti', 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-105', 'Aloo Paratha', 'Aloo Paratha', 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-106', 'Paneer Paratha', 'Paneer Paratha', 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-107', 'Gobhi Paratha', 'Gobhi Paratha', 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-108', 'Plain Paratha', 'Plain Paratha', 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-109', 'Dal Fry', 'Dal Fry', 100, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-110', 'Dal Tadka', 'Dal Tadka', 120, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-111', 'Dal Muglai', 'Dal Muglai', 140, true, true, 'Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', true, true),
      ('legacy-112', 'Paneer Muglai', NULL, 180, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-113', 'Paneer Kadhai', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-114', 'Paneer Bhurji Tadka', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-115', 'Paneer Bhurji', NULL, 180, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-116', 'Matar Paneer', NULL, 180, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-117', 'Bundi Raita', NULL, 60, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-118', 'Mix Veg', NULL, 180, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-119', 'Sev Bhaji', NULL, 120, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-120', 'Sev Tamatar', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-121', 'Aloo Jeera', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-122', 'Aloo Gobhi', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-123', 'Aloo Tamatar', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-124', 'Aloo Gobhi Matar', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-125', 'Chana Masala', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-126', 'Chole Paneer', NULL, 180, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-127', 'Bhindi Pyaj', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-128', 'Bhindi Karela', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-129', 'Aloo Palak', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-130', 'Kadhi Pakoda', NULL, 120, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-131', 'Chicken Kabab', NULL, 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-132', 'Chicken Masala', NULL, 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-133', 'Chicken Kadhai', NULL, 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-135', 'Chicken Lapeta', NULL, 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-136', 'Chicken Butter Masala', NULL, 260, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-138', 'Chicken Biryani', NULL, 240, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-141', 'Chicken Bhuna', NULL, 260, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-143', 'Egg Curry', NULL, 70, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-144', 'Egg Masala', NULL, 80, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-145', 'Egg Bhurji Curry', NULL, 70, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-147', 'Egg Bhurji', NULL, 50, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-148', 'Boiled Egg', NULL, 15, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-149', 'Fish Curry', NULL, 180, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-151', 'Fish Dahi Masala', NULL, 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-152', 'Egg Chilli', NULL, 160, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-154', 'Plain Rice', NULL, 60, true, true, 'Rice', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-155', 'Jeera Rice', NULL, 100, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-156', 'Egg Fry Rice', NULL, 140, false, true, 'Rice', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-158', 'Chicken Fry Rice', NULL, 240, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Tandoori Family Rasturant (legacy shop #26)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'tandoori-family-rasturant-26',
    'Tandoori Family Rasturant',
    'Biryani',
    false,
    false,
    'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Biryani', 'North Indian'],
    3.9,
    7,
    20,
    30,
    2,
    370,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-134', 'Sada Thali', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-137', 'Special Thali', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-140', 'Non Veg Thali', NULL, 220, true, true, 'Non-Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-146', 'Milk Shake', NULL, 40, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-159', 'Vanila Shake', NULL, 60, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-160', 'Strawberry Shake', NULL, 60, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-161', 'Chocolate Shake', NULL, 80, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-162', 'Family Salad', NULL, 100, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-163', 'Green Salad', NULL, 55, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-164', 'Kachumer Salad', NULL, 55, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-165', 'Onion Salad', NULL, 35, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-166', 'Papad Fry', NULL, 25, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-167', 'Papad Dry', NULL, 15, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-169', 'Masala Papad', NULL, 35, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-170', 'Plain Paratha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-171', 'Aalu Paratha', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-172', 'Gobhi Paratha', NULL, 65, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-173', 'Paneer Paratha', NULL, 65, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-174', 'Bread Omlete', NULL, 70, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-175', 'Chole Bhature', NULL, 90, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-176', 'Veg Cutlet', NULL, 90, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-177', 'Chhita Pakoda', NULL, 80, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-178', 'Paneer Cutlet', NULL, 110, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-179', 'Chana Roast', NULL, 110, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-181', 'Veg Pakoda', NULL, 100, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-182', 'Paneer Pakoda', NULL, 145, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-183', 'Hara-Bhara Kabab', NULL, 155, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-201', 'Paneer Tikka', NULL, 190, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-204', 'Paneer Garlic Tikka', NULL, 200, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-205', 'Paneer Special Tikka', NULL, 210, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-208', 'Veg Chowmein', NULL, 90, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-210', 'Veg Lolipop', NULL, 165, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-212', 'Chinese Bhel', NULL, 145, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-214', 'Chana Chilli', NULL, 165, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-217', 'Gobhi Chilli', NULL, 145, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-218', 'Paneer Chilli', NULL, 165, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-220', 'Paneer 65', NULL, 150, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-222', 'Chicken Hot&Sour Soup', NULL, 100, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-224', 'Chicken Shourba', NULL, 100, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-226', 'Tomato Soup', NULL, 80, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-229', 'Manchow Soup', NULL, 80, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-233', 'Sweet Corn Soup', NULL, 100, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-235', 'Boondi Raita', NULL, 65, true, true, 'Veg', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-238', 'Veg Raita', NULL, 80, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-240', 'MIx Raita', NULL, 80, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-242', 'Egg Bhurji', NULL, 80, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-245', 'Egg Bhurji Cury', NULL, 90, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-248', 'Egg Masala', NULL, 90, false, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-249', 'Matka Biryani', NULL, 330, true, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-251', 'Egg Biryani', NULL, 130, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-252', 'Chicken Biryani', NULL, 145, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-255', 'Fish Biryani', NULL, 130, false, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-258', 'Hyderabadi Biryani', NULL, 155, true, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-263', 'Chicken Roast', NULL, 110, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-266', 'Chicken Pakoda', NULL, 110, false, true, 'Non-Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-270', 'Paneer Masala', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-271', 'Paneer Butter Masala', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-272', 'Kadhai Paneer', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-273', 'Paneer Hyderabadi', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-274', 'Paneer Handi', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-275', 'Paneer Lababdar', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-276', 'Paneer Bhurji', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-277', 'Shahi Paneer', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-278', 'Paneer Korma', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-279', 'matar Paneer', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-280', 'Palak Paneer', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-281', 'Paneer Punjabi', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-282', 'Paneer Kolhapuri', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-283', 'Daal Fry', NULL, 110, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-284', 'Daal Tadaka', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-285', 'Plain daal', NULL, 90, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-286', 'Daal Makhani', NULL, 145, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-287', 'Daal Punjabi', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-288', 'Daal Butter Fry', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-289', 'Chicken Kadhai', NULL, 285, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-290', 'Butter Chicken', NULL, 285, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-291', 'Chicken Tikka Masala', NULL, 285, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-292', 'Chicken Kali Mirch', NULL, 285, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-293', 'Chicken Mughlai', NULL, 310, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-294', 'Chicken Do Pyaja', NULL, 300, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-295', 'Chicken Kolhapuri', NULL, 300, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-296', 'Chicken Rara', NULL, 300, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-297', 'Chicken Bhuna', NULL, 300, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-298', 'Chicken Punjabi', NULL, 310, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-299', 'Chicken Hyderabadi', NULL, 310, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-300', 'Chicken Handi', NULL, 310, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-312', 'Fish Bangali Curry', NULL, 175, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-313', 'Fish Masala', NULL, 410, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-314', 'Fish Tikka Masala', NULL, 410, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-315', 'Fish Kolhapuri', NULL, 410, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-322', 'Fish Lapeta', NULL, 110, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-327', 'Fish Kadhai', NULL, 220, false, true, 'Non-Veg', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-476', 'Egg Chilli', NULL, 165, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-477', 'Egg Fried Rice', NULL, 165, false, true, 'Non-Veg', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-479', 'Chicken Chilli Boneless', NULL, 275, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-480', 'Chicken Chowmein', NULL, 200, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-481', 'Chicken 65', NULL, 200, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-482', 'Chicken Lolipop', NULL, 275, false, true, 'Snacks and Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-483', 'Chicken Fried Rice', NULL, 275, false, true, 'Non-Veg', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-484', 'Steam Rice', NULL, 45, true, true, 'Rice', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-485', 'Jeera Rice', NULL, 45, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-486', 'Onion Tomato Jeera Rice', NULL, 100, true, true, 'Veg', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-487', 'Veg Biryani', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-488', 'Matar Pulav', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-489', 'Paneer Pulav', NULL, 155, true, true, 'Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-490', 'Veg Matka Biryani', NULL, 175, true, true, 'Veg', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-491', 'Veg Fried Rice', NULL, 145, true, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-492', 'Curd Rice', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-493', 'Masala Khichadi', NULL, 155, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-494', 'Daal Khichdi', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-495', 'Tandoori Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-496', 'Tawa Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-497', 'Tandoori Butter Roti', NULL, 20, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-498', 'Plain Naan', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-499', 'Butter Naan', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-500', 'Garlic Naan', NULL, 45, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-501', 'Stuffed Naan', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-502', 'Missi Roti', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-503', 'Masala Kulcha', NULL, 45, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-504', 'Paneer Kulcha', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-505', 'Lachha Paratha', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-506', 'Lachha Naan', NULL, 45, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-507', 'Kashmiri Naan', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-508', 'Cheese Corn Palak', NULL, 175, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-509', 'Matar Masala', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-510', 'Aalu Jeera', NULL, 90, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-511', 'Aalu Gobhi', NULL, 110, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-512', 'Gobhi Matar', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-513', 'Mix Veg', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-514', 'Veg Handi', NULL, 175, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-515', 'Veg Kadhai', NULL, 190, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-516', 'Veg Kolhapuri', NULL, 190, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-517', 'Dam Aalu', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-518', 'Aalu Dam Punjab', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-519', 'Gobhi Masala', NULL, 120, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-520', 'Bhindi Kurkure', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-521', 'Bhindi Do Pyaja', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-522', 'Bhindi Masala', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-523', 'Chana Masala', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-524', 'Chhole Punjabi', NULL, 155, true, true, 'Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-525', 'Mushroom Masala', NULL, 130, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-526', 'Mushroom Kadhai', NULL, 190, true, true, 'Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-527', 'Mushroom Kolhapuri', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-528', 'Veg Kofta', NULL, 165, true, true, 'Veg', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-529', 'Chapata Kofta', NULL, 200, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-530', 'Malai Kofta', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-532', 'Paneer Kofta', NULL, 220, true, true, 'Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-533', 'Tamater Chutney', NULL, 90, true, true, 'Veg', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1045', 'Veg Schezwan Noodles', NULL, 120, true, true, 'Snacks and Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sapphire Resturant (legacy shop #27)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sapphire-resturant-27',
    'Sapphire Resturant',
    'Indian Chinese',
    true,
    true,
    'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Chinese'],
    4.2,
    36,
    20,
    30,
    2,
    384,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-535', 'Veg Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-536', 'Onion Raita', NULL, 70, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-537', 'Boondi Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-538', 'Fruit Raita', NULL, 120, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-539', 'Onion Salad', NULL, 40, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-540', 'Green Salad', NULL, 60, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-541', 'Kachumber Salad', NULL, 60, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-542', 'Papad Dry', NULL, 25, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-543', 'Papad Fry', NULL, 30, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-544', 'Masala Papad', NULL, 35, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-545', 'Roasted Chana', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-546', 'Veg Sweet Corn Soup', NULL, 120, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-547', 'Hot & Sour Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-548', 'Tomato Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-549', 'Veg Manchow Soup', NULL, 120, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-550', 'Lemon Coriander Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-552', 'Aloo Paratha', NULL, 110, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-553', 'Paneer Paratha', NULL, 140, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-555', 'Onion Pakoda', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-556', 'Mix Veg Pakoda', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-557', 'Paneer Pakoda', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-558', 'Idli Sambhar', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-559', 'Vada Sambhar', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-560', 'Upma', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-561', 'Uttapam', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-562', 'Onion Tomato Uttapam', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-563', 'Plain Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-564', 'Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-565', 'Onion Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-566', 'Onion Masala Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-567', 'Cheese Masala Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-568', 'Rawa Plain Dosa', NULL, 130, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-569', 'Rawa Masala Dosa', NULL, 150, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-570', 'Jini Dosa', NULL, 170, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-571', 'Sapphire Special Dosa', NULL, 150, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-572', 'Veg Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-573', 'Cheese Sandwich', NULL, 120, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-574', 'Cheese Grilled Sandwich', NULL, 130, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-575', 'Grilled Club Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-576', 'Bombay Sandwich', NULL, 180, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-577', 'Veg Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-578', 'Onion Tomato Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-579', 'Cheese Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-580', 'Maxican Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-581', 'Paneer Pizza', NULL, 200, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-582', 'Cheese Corn Pizza', NULL, 200, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-583', 'Sapphire Special Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-584', 'French Fries', NULL, 110, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-585', 'Peri Peri Fries', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-586', 'Cheese French Fries', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-587', 'Veg Burger', NULL, 80, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-588', 'Cheese Burger', NULL, 120, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-589', 'Sapphire Special Burger', NULL, 200, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-590', 'Veg Manchurian', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-591', 'Gobhi Manchurian', NULL, 150, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-592', 'Paneer Manchurian', NULL, 210, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-593', 'Paneer Chilli', NULL, 230, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-594', 'Baby Corn Chilli', NULL, 260, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-595', 'Lovely Corn', NULL, 190, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-596', 'Baby Corn Mushroom Chilli', NULL, 260, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-597', 'Mushroom Chilli', NULL, 220, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-598', 'Chana Chilli', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-599', 'Paneer 65', NULL, 190, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-600', 'Mushroom with Sweet Chilli', NULL, 210, true, true, 'Chinese', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-601', 'Veg Lolipop', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-602', 'Veg Noodels', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-603', 'Hakka Noodels', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-604', 'Schezwan Noodels', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-605', 'Veg Fried Rice', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-606', 'Schezwan Fried Rice', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-607', 'Hong Kong Fried Rice', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-608', 'Tripal Schezwan Fried Rice', NULL, 240, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-609', 'Hara Bhara Kabab', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-611', 'Dahi Kabab', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-612', 'Seekh Kabab', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-613', 'Corn Kabab', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-614', 'Veg Haryali Kabab', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-615', 'Paneer Tikka', NULL, 220, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-616', 'Paneer Malai Tikka', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-617', 'Paneer Pudina Tikka', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-618', 'Paneer Reshmi Kabab', NULL, 260, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-619', 'Paneer Achari Tikka', NULL, 260, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-620', 'Sapphire Platter', 'Paneer Tikka, Seekh Kabab , Dahi Kabab, Aloo Nazakat.', 450, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-621', 'Plain Dal', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-622', 'Dal Fry', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-623', 'Dal Butter Tadka', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-624', 'Kolhapuri Punjabi Dal', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-625', 'Dal Dhabe Wali', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-626', 'Dal Makhani', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-627', 'Panchameli Dal', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-628', 'Sapphire Special Dal', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-629', 'Aloo Gobhi', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-630', 'Aloo Jeera', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-631', 'Mix Veg', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-632', 'Chana Masala', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-633', 'Aloo Matar', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-634', 'Gobhi Matar', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-635', 'Veg Kofta', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-636', 'Aloo Dum Kashmiri', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-637', 'Aloo Dum Punjabi', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-638', 'Palak Matar', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-639', 'Palak Corn', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-640', 'Palak Kofta', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-641', 'Veg Keema Kastoori', NULL, 210, false, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-642', 'Veg Kolhapuri', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-643', 'Sabzi Mohni', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-644', 'Kabab Masala', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-645', 'Veg Makhni', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-646', 'Veg Handi', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-647', 'Mushroom Masala', NULL, 210, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-648', 'Mushroom Handi', NULL, 260, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-649', 'Mushroom Kadhai', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-650', 'Mushroom Tikka Masala', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-651', 'Veg Jalfrezi', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-652', 'Tamatar Chutney', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-653', 'Bhindi Kurkure', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-654', 'Paneer Masala', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-655', 'Shahi Paneer', NULL, 270, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-656', 'Paneer Butter Masala', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-657', 'Palak Paneer', NULL, 210, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-658', 'Kadhai Paneer', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-659', 'Paneer Korma', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-660', 'Paneer Lababdaar', NULL, 260, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-661', 'Paneer Bhurji', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-662', 'Paneer Achari Masala', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-663', 'Paneer Punjabi', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-664', 'Paneer DO Pyaja', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-665', 'Paneer Kolhapuri', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-666', 'Paneer TIkka Masala', NULL, 270, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-667', 'Paneer Kofta', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-668', 'Paneer Maharani', NULL, 280, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-669', 'Paneer Chatpata', NULL, 280, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-670', 'Paneer Khurchan', NULL, 280, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-671', 'Paneer Takatak', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-672', 'Tandoori Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-673', 'Butter Tandoori Roti', NULL, 17, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-674', 'Tawa Roti', NULL, 20, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-675', 'Butter Tawa Roti', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-676', 'Plain Naan', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-677', 'Butter Naan', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-678', 'Garlic Naan', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-679', 'Laccha Paratha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-680', 'Cheese Naan', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-681', 'Plain Kulcha', NULL, 50, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-682', 'Masala Kulcha', NULL, 60, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-683', 'Paneer Kulcha', NULL, 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-685', 'Gobhi Paratha', 'With Curd (Dahi)', 120, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-686', 'Onion Paratha', 'With Curd (Dahi)', 110, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-687', 'Steamed Rice', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-688', 'Jeera Rice', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-689', 'Onion Tomato Jeera Rice', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-690', 'Matar Pulao', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-691', 'Veg Pulao', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-692', 'Masala Rice', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-693', 'Paneer Pulao', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-694', 'Kashmiri Pulao', NULL, 190, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-695', 'Dal Khichdi', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-696', 'Veg Biryani', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-697', 'Veg Hydrabadi Biryani', NULL, 200, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-698', 'Lemon Rice', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-699', 'Curd Rice', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-700', 'Gajar Ka Halwa', NULL, 70, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-701', 'Gulab Jamun', 'With Ice Cream', 60, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-702', 'Rashgulla', 'with Rabdi', 80, true, true, 'Sweets & Deserts', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3636', 'Tea', NULL, 25, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3637', 'Coffee', NULL, 40, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3638', 'Cold Coffee', NULL, 110, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3639', 'Cold Coffee with Icecream', NULL, 130, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3640', 'Butter Milk', NULL, 40, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3641', 'Lassi', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3642', 'Fresh Lime Soda', NULL, 40, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3643', 'Masala Cold Drink', NULL, 60, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3644', 'Cold Drink 200 ml', NULL, 25, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3645', 'Cold Drink 600 Ml', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3646', 'Mineral Water', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3647', 'Chocolate Shake', NULL, 150, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3648', 'Kitkat Shake', NULL, 170, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3649', 'Oreo Shake', NULL, 170, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3651', 'Garlic Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3652', 'Cheese Garlic Toast', NULL, 120, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3653', 'Cheese Chilli Bread', NULL, 130, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3654', 'Maxican Brustta', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3657', 'Cheese Paneer Masala Dosa', NULL, 180, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3658', 'Onion Upma', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3659', 'Oinon Tomato Upma', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3660', 'Chilli Garlic Noodles', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4669', 'Cheese Masala Dosa', NULL, 130, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4670', 'Sapphire Special Dosa', NULL, 190, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4672', 'Chole Bhature', NULL, 140, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4673', 'Veg Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Murari Rasturant (legacy shop #28)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'murari-rasturant-28',
    'Murari Rasturant',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.7,
    3,
    20,
    30,
    2,
    337,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-863', 'Finger Chips', NULL, 80, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-864', 'Veg Pakoda', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-865', 'Gobhi Pakoda', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-866', 'Paneer Pakoda', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-867', 'Onion Pakoda', NULL, 60, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-868', 'Chana Roast', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-869', 'Chole Bhature', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-870', 'Veg Chowmein', NULL, 100, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-871', 'Hakka Noodels', NULL, 120, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-872', 'Schezwan Chowmein', NULL, 150, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-873', 'White Sauce Pasta', NULL, 120, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-874', 'Red Sauce Pasta', NULL, 120, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-877', 'Paneer Chilli', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-878', 'Gobhi Chilli', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-879', 'Mushroom Chilli', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-880', 'Chana Chilli', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-881', 'Veg Crispy', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-882', 'Paneer 65', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-883', 'Veg Manchurian', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-885', 'Mushroom 65', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-886', 'Chowmein Choupsey', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-889', 'Plain Dosa', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-890', 'Masala Dosa', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-891', 'Cutting Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-892', 'Paneer Masala Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-894', 'Chinese Dosa', NULL, 160, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-895', 'Sambhar Wada', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-896', 'Masala Uttapam', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-897', 'Veg Uttapam', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-899', 'Idly Sambhar', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-901', 'Onion Salad', NULL, 30, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-903', 'Green Salad', NULL, 60, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-904', 'Kachumber Salad', NULL, 70, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-905', 'Papad Fry', NULL, 25, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-907', 'Papad Dry', NULL, 20, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-909', 'Masala Papad', NULL, 40, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-911', 'Veg Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-912', 'Boondi Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-913', 'Mix Fruit Raita', NULL, 100, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-914', 'Plain Curd', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-918', 'Dal Fry', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-920', 'Dal Jeera', NULL, 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-922', 'Dal Handi', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-923', 'Mix Veg', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-924', 'Gobhi Matar', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-925', 'Chana Masala', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-926', 'Veg Kadhai', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-927', 'Veg Handi', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-929', 'Aloo Jeera', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-930', 'Aloo Gobhi Matar', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-932', 'Aloo Matar', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-933', 'Veg Kolhapuri', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-935', 'Bhindi Pyaj', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-936', 'Bhindi Masala', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-937', 'Bhindi Kurkure', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-938', 'Karela Masala', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-939', 'Sev Bhaji', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-940', 'Sev Tamatar', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-942', 'Mushroom Kadhai', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-944', 'Mushroom Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-945', 'Kaju Curry', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-947', 'Kadhi Pakoda', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-948', 'Malai Kofta', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-949', 'Paneer Butter Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-950', 'Paneer Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-951', 'Matar Paneer', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-952', 'Kadhai Paneer', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-953', 'Paneer Lachhedar', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-954', 'Saahi Paneer', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-955', 'Paneer Pasanda', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-956', 'Paneer Kolhapuri', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-957', 'Paneer Handi', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-958', 'Paneer Bhurji Dry', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-959', 'Paneer Bhurji Gravy', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-960', 'Paneer Punjabi', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-961', 'Paneer Do Pyaja', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-962', 'Paneer Lazeez', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-963', 'Paneer Hydrabadi', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-964', 'Paneer TIkka Masala', NULL, 250, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-965', 'Chole Paneer', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-966', 'Tawa Roti', NULL, 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-967', 'Butter Tawa Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-968', 'Aloo Paratha', 'With Curd (Dahi)', 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-969', 'Gobhi Paratha', 'With Curd (Dahi)', 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-970', 'Paneer Paratha', 'With Curd (Dahi)', 100, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-971', 'Plain Paratha', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-984', 'Steamed Rice', NULL, 70, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-985', 'Jeera Rice', NULL, 99, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-986', 'Masala Rice', NULL, 120, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-987', 'Veg Pulao', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-988', 'Green Pees Pulao', NULL, 120, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-989', 'Onion Tomato Rice', NULL, 120, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-990', 'Veg Biryani', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- The Golden Cafe (legacy shop #29)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'the-golden-cafe-29',
    'The Golden Cafe',
    'Foods Juices & Shakes',
    false,
    false,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3,
    1,
    20,
    30,
    2,
    231,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-711', 'Regular Pizza', NULL, 99, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-712', 'Corn and Onion Pizza', NULL, 149, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-713', 'Paneer Pizza', NULL, 159, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-714', 'Tandoori Pizza', NULL, 199, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-715', 'Double Paneer Pizza', NULL, 219, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-716', 'Salted Fries', NULL, 60, true, true, 'Fries', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-717', 'Peri Peri Masala Fries', NULL, 80, true, true, 'Fries', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-718', 'Masala Fries', NULL, 70, true, true, 'Fries', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-719', 'Creamy Cheese Fries', NULL, 120, true, true, 'Fries', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-720', 'Strawberry Shake', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-721', 'Watermelon Shake', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-722', 'Banana Shake', NULL, 30, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-724', 'Lemon Soda', NULL, 30, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-725', 'Mango Shake', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-726', 'Watermelon Juice', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-727', 'Apple Juice', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-728', 'Mosambi Juice', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-729', 'Pineapple Juice', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-730', 'Blue Mojito', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-731', 'Mint Mojito', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-732', 'KitKat Shake', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-734', 'Regular Cold Coffee', NULL, 39, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-735', 'Thick Cold Coffee', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-736', 'Cold Coffee +Chocolate Slice', NULL, 70, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-737', 'Oreo Coffee', NULL, 50, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-738', 'Aloo Patties Burger', NULL, 49, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-739', 'Aloo Patty Cheese Burger', NULL, 60, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-740', 'Veg Patty Burger', NULL, 69, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-741', 'Veg Patty Cheese Burger', NULL, 79, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-742', 'Veg Cheese Sandwich', NULL, 50, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-743', 'Corn Cheese Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-744', 'Paneer Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-745', 'Maxican Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-746', 'Veggie Combo', NULL, 160, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-747', 'Paneer Pizza+Salted Fries', NULL, 187, true, true, 'Combo Offer', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-748', 'Double Paneer Pizza+Aloo Patty Burger', NULL, 228, true, true, 'Combo Offer', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-749', 'Double Paneer Pizza+Mint Mojito', NULL, 228, true, true, 'Combo Offer', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-750', 'Tandoori Pizza+Coke', NULL, 187, true, true, 'Combo Offer', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-751', 'Tandoori Pizza+Coke+Cheese Corn Sandwich', NULL, 238, true, true, 'Combo Offer', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Annapurna Bhel Bhandar (legacy shop #30)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'annapurna-bhel-bhandar-30',
    'Annapurna Bhel Bhandar',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    1,
    20,
    30,
    1,
    NULL,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
)
SELECT id FROM upsert_restaurant;

-- Dauji Momos (legacy shop #31)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'dauji-momos-31',
    'Dauji Momos',
    'Foods',
    true,
    true,
    'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    2.5,
    2,
    20,
    30,
    1,
    100,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-704', 'Steamed Momos', '6 Pieces of Momos', 40, true, true, 'Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-705', 'Fried Momos', '6 Pieces of Momos', 40, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-706', 'Chinese Pakoda', 'Half Plate', 40, true, true, 'Momos', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-707', 'Finger Chips', 'Half', 40, true, true, 'Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Shreenath Pav Bhaji (legacy shop #32)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'shreenath-pav-bhaji-32',
    'Shreenath Pav Bhaji',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.4,
    22,
    20,
    30,
    1,
    174,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-752', 'Pav Bhaji', NULL, 65, true, true, 'Shreenath', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-753', 'Pulav', NULL, 80, true, true, 'Shreenath', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-754', 'Manchurian', NULL, 80, true, true, 'Shreenath', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-755', 'Dabeli', NULL, 30, true, true, 'Shreenath', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-756', 'Chowmein', NULL, 60, true, true, 'Shreenath', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-757', 'Manchurian Rice', NULL, 110, true, true, 'Shreenath', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-758', 'Manchurian Noodels', NULL, 100, true, true, 'Shreenath', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1348', 'Extra Bhaji', NULL, 50, true, true, 'Shreenath', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1349', 'Extra Pav', NULL, 20, true, true, 'Shreenath', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4664', 'Butter Pav Bhaji', NULL, 100, true, true, 'Shreenath', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- China Town (legacy shop #33)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'china-town-33',
    'China Town',
    'No',
    false,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    2,
    4,
    20,
    30,
    2,
    207,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-803', 'Veg Chowmein', NULL, 60, true, true, 'Chowmein', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-804', 'Paneer Chowmein', NULL, 80, true, true, 'Chowmein', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-809', 'Spring Roll', NULL, 70, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-810', 'Finger Chips', NULL, 50, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-811', 'Chilli Potato', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-812', 'Honey Chilli Potato', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-817', 'Chilli Paneer Dry', NULL, 150, true, true, 'Chowmein', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-819', 'Steamed Momos', NULL, 40, true, true, 'Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-821', 'Fried Momos', NULL, 50, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-823', 'Paneer Burger', NULL, 60, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-830', 'Manchurian', NULL, 100, true, true, 'Chowmein', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1268', 'Chilli Paneer Gravy', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1269', 'Soya Chilli', NULL, 60, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1270', 'Manchurian Rice', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Gujarati Sweets and Namkeen (legacy shop #34)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'gujarati-sweets-and-namkeen-34',
    'Gujarati Sweets and Namkeen',
    'Sweets And Namkeens',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.6,
    8,
    20,
    30,
    2,
    269,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-759', 'Jain Samosa', NULL, 13, true, true, 'Samosa', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-760', 'Jain Kachori', NULL, 15, true, true, 'Kachori', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-761', 'Fafda', NULL, 100, true, true, 'Namkeen', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-762', 'Khaman Dhokla', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-763', 'Tasty Nuts', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-764', 'Laung Sav', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-765', 'Papdi', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-766', 'Namkeen Saloni', NULL, 40, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-767', 'Sweet Saloni', NULL, 40, true, true, 'Namkeen', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-768', 'Chakli', NULL, 40, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-769', 'Bhakharvadi', NULL, 40, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-770', 'Aloo Chips', NULL, 30, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-771', 'Banana Chips', NULL, 42, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-772', 'Khakhra', NULL, 70, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-774', 'Falahari Mixture', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-776', 'Phool Badi', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-777', 'Chola Fari', NULL, 70, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-778', 'Gujarati Kachori', NULL, 30, true, true, 'Namkeen', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-779', 'Bhujiya Sev', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-780', 'Thepla', NULL, 50, true, true, 'Namkeen', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-781', 'Khandvi', NULL, 70, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-782', 'Pineapple Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-783', 'Rasmalai Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-784', 'Chocolate Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-785', 'Vanilla Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-786', 'Tuti Fruti Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-787', 'Black Forest Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-788', 'Red Velvet Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-789', 'MIxture', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-790', 'Kaju Katli', 'Diwali offer', 230, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-791', 'Milk Cake', NULL, 120, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-792', 'Malai Laddu', NULL, 120, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-793', 'Kalakand', NULL, 100, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-794', 'Peda', NULL, 100, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-795', 'Barfi', NULL, 90, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-796', 'Nariyal Laddu', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-797', 'Gulab Jamun', NULL, 15, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-798', 'Khowa Jalebi', NULL, 100, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-799', 'Rashgulla', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-800', 'Malai Chap', NULL, 120, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-801', 'Rasmalai', NULL, 120, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-802', 'Lashun Sev', NULL, 60, true, true, 'Namkeen', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2140', 'Khoya Modak', NULL, 120, true, true, 'MODAK', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2708', 'BOONDI', NULL, 50, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- KK Dhaba & Biryani Centre (legacy shop #35)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'kk-dhaba-biryani-centre-35',
    'KK Dhaba & Biryani Centre',
    'Non Veg',
    false,
    true,
    'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Biryani'],
    3.5,
    2,
    20,
    30,
    2,
    262,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-831', 'Chicken Biryani', 'Half', 130, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-833', 'Egg Biryani', NULL, 160, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-834', 'Veg Biryani', NULL, 160, true, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-835', 'Chicken Curry', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-836', 'Fish Curry', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-837', 'Fish Roast', NULL, 100, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-838', 'Chicken Masala', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-839', 'Egg Curry', NULL, 70, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-840', 'Egg Bhurji Curry', NULL, 70, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-841', 'Egg Bhurji', NULL, 40, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-842', 'Paneer Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-843', 'Matar Paneer', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-844', 'Chole Paneer', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-845', 'Karela Pyaj', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-846', 'Bhindi Pyaj', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-847', 'Chana Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-848', 'Aloo Gobhi', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-850', 'Dal Fry', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-851', 'Dal Tadka', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-853', 'Tandoori Roti', NULL, 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-854', 'Butter Tandoori Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-855', 'Chana Roast', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-856', 'Plain RIce', NULL, 60, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-857', 'Jeera Rice', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-858', 'Salad', NULL, 60, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-859', 'Kachumber Salad', NULL, 80, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-860', 'Papad Dry', NULL, 20, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-861', 'Papad Fry', NULL, 30, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Food Plaza Restaurant (legacy shop #36)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'food-plaza-restaurant-36',
    'Food Plaza Restaurant',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.5,
    47,
    20,
    30,
    2,
    369,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-992', 'Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-993', 'Plain Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-994', 'Butter Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-995', 'Cutting Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-996', 'Paneer Masala Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-997', 'Paper Masala Dosa', NULL, 130, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-998', 'Shahi Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-999', 'Cheese Masala Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1000', 'Food Plaza Special Dosa', NULL, 130, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1001', 'Veg Uttapam', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1002', 'Veg Burger', NULL, 90, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1003', 'Cheese Corn Burger', NULL, 110, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1004', 'Finger Chips', NULL, 110, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1005', 'Peri Peri Fries', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1006', 'Veg Cutlet', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1007', 'Veg Pakoda', NULL, 110, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1008', 'Paneer Pakoda', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1009', 'Hara Bhara Kabab', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1010', 'Veg Kabab', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1011', 'Chole Bhature', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1012', 'Chana Roast', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1013', 'Plain Cheese Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1014', 'Veg Grilled Sandwich', NULL, 110, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1015', 'Cheese Corn Sandwich', NULL, 110, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1016', 'Chocolate Sandwich', NULL, 130, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1017', 'Bombay Masala Sandwich', NULL, 130, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1018', 'Paneer Sandwich', NULL, 120, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1019', 'Maxican Sandwich', NULL, 120, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1020', 'Veg Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1021', 'Paneer Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1022', 'Corn Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1023', 'Mushroom Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1024', 'Maxican Pizza', NULL, 200, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1025', 'Exotic Veggies Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1026', 'Food Plaza Special Pizza', NULL, 250, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1027', 'Veg Soup', NULL, 90, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1028', 'Tomato Soup', NULL, 100, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1029', 'Manchow Soup', NULL, 90, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1030', 'Hot & Sour Soup', NULL, 90, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1031', 'Mushroom Soup', NULL, 100, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1032', 'Papad Dry', NULL, 10, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1033', 'Papad Fry', NULL, 15, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1034', 'Masala Papad', NULL, 40, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1035', 'Onion Salad', NULL, 50, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1036', 'Green Salad', NULL, 70, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1037', 'Faimly Salad', NULL, 100, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1038', 'Kachumber Salad', NULL, 80, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1039', 'Boondi Raita', NULL, 70, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1040', 'Veg Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1041', 'Plain Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1042', 'Fruit Raita', NULL, 110, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1043', 'Pineapple Raita', NULL, 110, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1044', 'Plain Curd', NULL, 40, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1046', 'Aloo Gobhi Mater', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1047', 'Chana Masala', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1048', 'Mix Veg', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1049', 'Veg Chowmein', NULL, 140, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1050', 'Aloo Mater', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1051', 'Paneer Chowmein', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1052', 'Hakka Noodels', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1053', 'Paneer Chilli', NULL, 210, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1054', 'Veg Manchurian', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1055', 'Plain Palak', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1056', 'Gobhi Manchurian', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1057', 'Gobhi Chilli', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1058', 'Gobhi Masala', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1060', 'Palak Corn', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1062', 'Palak Matar', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1063', 'Mushroom Chilli', NULL, 200, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1064', 'Bhindi Masala', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1065', 'Chana Chilli', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1066', 'Bhindi Kurkure', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1067', 'Bhindi Do Pyaja', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1068', 'Veg Kofta', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1069', 'Veg Fried Rice', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1070', 'Sev Tamater', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1071', 'Sechzwan Fried Rice', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1072', 'Plain Maggi', NULL, 100, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1073', 'Masala Maggi', NULL, 100, true, true, 'Maggi', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1074', 'Cheese Masala Maggi', NULL, 120, true, true, 'Maggi', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1075', 'Karela Masala', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1076', 'Karela Roast', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1077', 'Matar Masala', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1078', 'Veg Crispy', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1079', 'Baby Corn Chilli', NULL, 210, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1080', 'Hariyali Kofta', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1081', 'Corn Chilli', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1082', 'Veg Kadai', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1083', 'Corn Crispy', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1084', 'Veg Handi', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1085', 'Lovely Corn', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1086', 'Veg Kolhapuri', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1087', 'Paneer Manchurian', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1088', 'Aloo Palak Matar', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1089', 'Aloo Jeera', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1090', 'Aloo Methi', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1091', 'Stuffed Tomato', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1092', 'Chinese Bhel', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1093', 'Dum Aloo', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1094', 'Veg Lolipop', NULL, 210, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1095', 'Tamater Chutney', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1097', 'Chilli Potato', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1098', 'Schezwan Paneer', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1099', 'Stuffed Shimla', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1100', 'Paneer 65', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1101', 'Cheese Corn Ball', NULL, 210, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1102', 'Manchurian RIce', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1103', 'Kaju Kari', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1104', 'Kaju Handi', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1105', 'Singapore Rice', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1106', 'Veg Jaipuri', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1107', 'Paneer Masala', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1108', 'Mushroom Masala', NULL, 210, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1109', 'Matar Paneer', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1110', 'Kadhai Paneer', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1111', 'Palak Paneer', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1112', 'Mushroom Handi', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1113', 'Paneer Bhurji', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1114', 'Paneer Gobhi Masala', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1115', 'Mushroom Kadhai', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1116', 'Paneer Corn Masala', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1117', 'Kaju Paneer', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1118', 'Methi Matar Malai', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1119', 'Veg Navratan Korma', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1123', 'Plain Rice', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1124', 'Jeera Rice', NULL, 110, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1125', 'Veg Pulao', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1126', 'Green Matar Pulao', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1127', 'Paneer Pulao', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1128', 'Veg Biryani', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1129', 'Veg Handi Biryani', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1130', 'Veg Hyderabadi Biryani', NULL, 180, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1131', 'Kashmiri Pulao', NULL, 160, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1132', 'Special Biryani', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1133', 'Lemon Rice', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1134', 'Curd Rice', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1135', 'Masala Rice', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1136', 'Tomato Onion Jeera Rice', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1137', 'Special Thali', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1138', 'Khichdi', NULL, 120, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1139', 'Paneer Lazeez', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1140', 'Veg Khichdi', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1141', 'Masala Khichdi', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1142', 'Paneer Takatak', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1143', 'Paneer Kofta', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1144', 'Paneer Kolhapuri', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1145', 'Daal Dahi Khichdi', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1146', 'Paneer Handi', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1147', 'Paneer Butter Masala', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1148', 'Paneer Tikka', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1149', 'Rashgulla', NULL, 40, true, true, 'Sweet & Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1150', 'Shahi Paneer', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1152', 'Mushroom Paneer', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1154', 'Paneer Tikka Lababdaar', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1155', 'Paneer TIkka Masala', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1157', 'Paneer Rogan Josh', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1158', 'Paneer Adraki', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1159', 'Daal Fry', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1160', 'Paneer Pasanda', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1161', 'Daal Tadka', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1162', 'Plain Daal', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1163', 'Paneer Pinwheel', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1164', 'Paneer Do Pyaja', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1166', 'Daal Jeera', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1167', 'Paneer Kurkure', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1168', 'Daal Kolhapuri', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1169', 'Paneer Hydrabadi', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1170', 'Paneer Punjabi', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1171', 'Daal Butter Fry', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1173', 'Tandoori Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1174', 'Lachha Cheese Paratha', NULL, 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1175', 'Tandoori Butter Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1177', 'Cheese Paratha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1178', 'Lachha Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1180', 'Plain Naan', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1181', 'Butter Naan', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1182', 'Kashmiri Naan', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1183', 'Plain Paratha', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1184', 'Garlic Naan', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1185', 'Masala Kulcha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1186', 'Stuffed Kulcha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1187', 'Aloo Paratha', 'with curd', 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1188', 'Plain Kulcha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1190', 'Onion Paratha', 'with curd', 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1191', 'Mix Veg Paratha', 'with curd', 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1192', 'Paneer Paratha', 'with curd', 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4663', 'Paneer maharaja', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Murari Hotel (legacy shop #37)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'murari-hotel-37',
    'Murari Hotel',
    'Nasta & Sweets',
    false,
    false,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.1,
    7,
    20,
    30,
    2,
    248,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-875', 'Samosa', NULL, 35, true, true, 'Nasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-876', 'Kachori', NULL, 35, true, true, 'Nasta', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-900', 'Plain Dosa', NULL, 55, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-902', 'Masala Dosa', NULL, 65, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-906', 'Cutting Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-908', 'Paneer Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-910', 'Paneer Cutting Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-915', 'Butter Cutting Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-916', 'Butter Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-917', 'Idli Sambhar', NULL, 35, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-919', 'Fry Idli', NULL, 65, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-921', 'Sambhar Vada', NULL, 45, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-928', 'Veg Uttapam', NULL, 65, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-931', 'Paneer Uttapam', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-941', 'Veg Grilled Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1637', 'Kalakand', NULL, 130, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1638', 'Milk Cake', NULL, 130, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1639', 'Malai Roll', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1640', 'Dry Fruit Laddu (Aata)', NULL, 130, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1641', 'Dry Fruit Laddu', NULL, 220, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1642', 'Mawa Bati', NULL, 25, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1643', 'Gulab Jamun', NULL, 70, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1644', 'Kaju Paan', NULL, 280, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1645', 'Kaju Katli', NULL, 220, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1646', 'Kaju Roll', NULL, 280, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1647', 'Maida Jalebi', NULL, 30, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1648', 'Nariyal Laddu', NULL, 90, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1649', 'Nariyal Barfi', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1650', 'Rasmalai', NULL, 45, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1651', 'Rabdi', NULL, 45, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1652', 'Rashgulla', 'includes 10 Pieces of Rashgulla', 165, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1653', 'Chamcham', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1654', 'Malai Katli', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1655', 'Plain Magaj Laddu', NULL, 70, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1656', 'Ghee Magaj laddu', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1657', 'Murari Peda', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1658', 'Mini Peda', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1659', 'Chocolate Kalakand', NULL, 90, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1660', 'Boondi Laddu', NULL, 60, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1672', 'Chole Bhature', NULL, 65, true, true, 'Nasta', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2142', 'Desi Ghee Modak', 'Contains Desi Ghee, Gud and Aata.', 130, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2631', 'Dahi Samosa', NULL, 45, true, true, 'Nasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2632', 'Dahi Kachori', NULL, 45, true, true, 'Nasta', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- VEGETABLES (legacy shop #39)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'vegetables-39',
    'VEGETABLES',
    'Vegetables',
    false,
    true,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    20,
    30,
    1,
    75,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4751', 'Vegetables and Fruits', NULL, 30, true, true, 'Vegetables', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Chicken Karwa (legacy shop #41)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'chicken-karwa-41',
    'Chicken Karwa',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    20,
    30,
    2,
    217,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1280', 'Egg Roll', NULL, 40, false, true, 'Non-Veg', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1281', 'Bread Omlete', NULL, 50, true, true, 'Non-Veg', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1282', 'Omelette', NULL, 40, true, true, 'Non-Veg', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1283', 'Egg Chowmein', NULL, 80, false, true, 'Non-Veg', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1284', 'Chicken Chowmein', NULL, 100, false, true, 'Non-Veg', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1285', 'Chicken Roll', NULL, 80, false, true, 'Non-Veg', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1286', 'Egg Fried Rice', NULL, 100, false, true, 'Non-Veg', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1287', 'Chicken Rice', NULL, 120, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1288', 'Chicken chilly', NULL, 140, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1289', 'Chicken Pakoda', NULL, 140, false, true, 'Non-Veg', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2900', 'Anda bhurji', NULL, 60, true, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2901', 'Anda bhurji tari', NULL, 90, true, true, 'Non-Veg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- New Choupati Cafe (legacy shop #44)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'new-choupati-cafe-44',
    'New Choupati Cafe',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    20,
    30,
    2,
    250,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1636', 'Kullhad Pizza', NULL, 80, true, true, 'Choupati', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2353', 'Regular veg pizza', NULL, 120, true, true, 'Choupati', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- BHAIRAV NATH FALUDA (legacy shop #46)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'bhairav-nath-faluda-46',
    'BHAIRAV NATH FALUDA',
    'Juices & Shakes',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3,
    1,
    20,
    30,
    1,
    125,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2124', 'Kaju Shake', NULL, 40, true, true, 'Bhairav Nath Faluda', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2125', 'Badam Shake', NULL, 40, true, true, 'Bhairav Nath Faluda', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2126', 'Faluda', NULL, 70, true, true, 'Bhairav Nath Faluda', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- MURARI SIGRI DOSA (legacy shop #47)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'murari-sigri-dosa-47',
    'MURARI SIGRI DOSA',
    'South Indian',
    false,
    false,
    'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['South Indian'],
    5,
    0,
    10,
    20,
    2,
    367,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1450', 'Jinni Dosa', NULL, 120, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1451', 'Paneer Jinni Dosa', NULL, 150, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1452', 'Dil Kush Dosa', NULL, 120, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1453', 'Cheese Chilli Dosa', NULL, 140, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1454', 'Pizza Dosa', NULL, 150, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1455', 'Kerala Masala Dosa', NULL, 130, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1456', 'Paneer Chilli Dosa', NULL, 140, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1457', 'Chinese Cheese Dosa', NULL, 130, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1458', 'Murari Special Dosa', NULL, 170, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1459', 'Pasta Dosa', NULL, 150, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1460', 'Kolhapuri Dosa', NULL, 120, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1461', 'Pink Panther Dosa', NULL, 140, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1462', 'Manchurian Dosa', NULL, 140, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1463', 'Sweet Corn Dosa', NULL, 130, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1464', 'Matka Dosa', NULL, 200, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1465', 'Bhurj Khalifa Dosa', NULL, 220, true, true, 'Sigri dosa', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Balaji Super Mart (legacy shop #49)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'balaji-super-mart-49',
    'Balaji Super Mart',
    'KIRANA',
    false,
    false,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    20,
    30,
    1,
    NULL,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
)
SELECT id FROM upsert_restaurant;

-- Suruchi Rajasthani Resturant (legacy shop #50)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'suruchi-rajasthani-resturant-50',
    'Suruchi Rajasthani Resturant',
    'THALI',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.5,
    2,
    20,
    30,
    2,
    294,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1500', 'Veg Biryani', NULL, 175, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1501', 'Veg Pulao', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1502', 'Masala Rice', NULL, 110, true, true, 'Rice', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1503', 'Jeera Rice', NULL, 85, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1504', 'Plain RIce', NULL, 65, true, true, 'Rice', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1505', 'Daal Handi', NULL, 155, true, true, 'Daal', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1506', 'Daal Makhani', NULL, 155, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1507', 'Daal Tadaka', NULL, 130, true, true, 'Daal', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1508', 'Daal Fry', NULL, 100, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1509', 'Daal Jeera', NULL, 80, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1510', 'Veg Raita', NULL, 55, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1511', 'Bundi Raita', NULL, 55, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1512', 'Dahi', NULL, 55, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1513', 'Lassi', NULL, 45, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1514', 'Chach', NULL, 35, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1515', 'Paneer Handi', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1516', 'Kadhai Paneer', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1517', 'Shahi Paneer', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1518', 'Paneer Kofta', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1519', 'Paneer Bhurji', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1520', 'Paneer Punjabi', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1521', 'Paneer Chilli', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1522', 'Paneer Butter Masala', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1523', 'Paneer Do Pyaja', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1525', 'Matar Paneer', NULL, 175, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1526', 'Chole Paneer', NULL, 175, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1527', 'Paneer Masala', NULL, 175, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1528', 'Paneer Paratha', NULL, 65, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1529', 'Gobhi Paratha', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1530', 'Aloo Paratha', NULL, 55, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1531', 'Plain Paratha', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1532', 'Tawa Roti', NULL, 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1533', 'Papad Churi', NULL, 55, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1534', 'Masala Papad', NULL, 50, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1535', 'Papad Dry', NULL, 15, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1536', 'Papad Fry', NULL, 25, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1572', 'Mix Veg', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1574', 'Dum Aloo', NULL, 145, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1575', 'Chole Masala', NULL, 145, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1580', 'Jodhpuri Besan Gatta', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1588', 'Sev Tamatar', NULL, 135, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1589', 'Shimla Tamater', NULL, 135, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1590', 'Bhindi Masala', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1591', 'Gobhi Matar', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1592', 'Karela Pyaaj', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1593', 'Aaloo Jeera', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1594', 'Aloo Chole', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1595', 'Aalu palak', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1596', 'Aalu Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1597', 'Tamater Chutney', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1598', 'Gobhi Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1599', 'Pyaaz Tamatar', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1600', 'Sada Thali', '3 Roti,2 Sabji,Daal,Rice', 130, true, true, 'Thali', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1601', 'Special Thali', '5 Roti,3 Sabji,Daal,Chawal,Raita,Meetha', 160, true, true, 'Thali', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1602', 'Parcel Thali', '5 Roti,3 Sabji,Daal,Chawal,Raita,Meetha', 150, true, true, 'Thali', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- BMT FAST FOOD AND PAV BHAJI (legacy shop #51)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'bmt-fast-food-and-pav-bhaji-51',
    'BMT FAST FOOD AND PAV BHAJI',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    20,
    30,
    1,
    131,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1662', 'Sambhar Vada', NULL, 25, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1663', 'Idli Sambhar', NULL, 20, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1664', 'Masala Dosa', NULL, 30, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1665', 'Cutting Masala Dosa', NULL, 40, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1666', 'Chinese Dosa', NULL, 60, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1667', 'Paneer Dosa', NULL, 100, true, true, 'Fast Food', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1668', 'Cheese Masala Dosa', NULL, 130, true, true, 'Fast Food', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1669', 'Pav Bhaji', NULL, 50, true, true, 'Fast Food', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1670', 'Chowmein', NULL, 40, true, true, 'Fast Food', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1671', 'Idli Wada Mix', NULL, 30, true, true, 'Fast Food', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Rahul Hotel (legacy shop #52)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'rahul-hotel-52',
    'Rahul Hotel',
    'SAMOSA',
    false,
    false,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    42,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1629', 'Samosa', NULL, 10, true, true, 'Samosa', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1630', 'Poha', NULL, 20, true, true, 'SNACKS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1631', 'Samosa-Poha Mix', NULL, 20, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Anmol Bhoku Hotel (legacy shop #53)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'anmol-bhoku-hotel-53',
    'Anmol Bhoku Hotel',
    'SAMOSA',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.5,
    8,
    25,
    35,
    1,
    98,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1626', 'Aalo Gunda', NULL, 13, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1627', 'Kachori', NULL, 13, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1628', 'Jalebi', NULL, 40, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2627', 'Khowa Jalebi', NULL, 90, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Zorko Resturant (legacy shop #59)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'zorko-resturant-59',
    'Zorko Resturant',
    'foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.3,
    63,
    25,
    35,
    2,
    302,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-1742', 'Idli Sambhar', NULL, 35, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1743', 'Fried Idli', NULL, 89, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1745', 'Plain Dosa', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1746', 'Masala Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1747', 'Cutting Masala Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1748', 'Cheese Masala Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1750', 'Margherita Pizza', NULL, 99, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1751', 'Jini Dosa', NULL, 139, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1752', 'Upma', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1753', 'Hindustani Margarita Pizza', NULL, 109, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1754', 'Uttapam', NULL, 99, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1756', 'Paneer Masala Dosa', NULL, 189, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1757', 'Capsicum And Onion Cheese Pizza', NULL, 129, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1758', 'Corn And Capsicum Pizza', NULL, 129, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1759', 'Aloo Poori', NULL, 79, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1760', 'Chole Bhature', NULL, 139, true, true, 'SNACKS', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1761', 'Poha', NULL, 50, true, true, 'SNACKS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1763', 'Hot To Hell Cheese Pizza', NULL, 159, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1766', 'Veg Exotica Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1768', 'Paneer Peri Peri Pizza', NULL, 200, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1769', 'Paneer Makhani Pizza', NULL, 220, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1774', 'Mushroom Pizza', NULL, 230, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1775', 'Classic Jumbo Burger', NULL, 60, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1777', 'Peri Peri Burger', NULL, 79, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1779', 'Spicy Barbeque Burger', NULL, 89, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1782', 'Indian Delight Burger', NULL, 89, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1786', 'Punjabi Tadka Burger', NULL, 79, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1790', 'Double Tikki Burger', NULL, 89, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1794', 'Maxican King Burger', NULL, 99, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1796', '7 Saucy King Burger', NULL, 129, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1800', 'Royal Paneer Grilled Burger', NULL, 110, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1802', 'Hot & Sour Soup', NULL, 89, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1804', 'Manchow Soup', NULL, 99, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1806', 'Sweet Corn Soup', NULL, 89, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1807', 'Tomato Soup', NULL, 79, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1810', 'Mushroom Soup', NULL, 109, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1833', 'Salted French Fries', NULL, 99, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1835', 'Peri Peri Fries', NULL, 120, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1838', 'Cheese Masala Fries', NULL, 130, true, true, 'SNACKS', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1850', 'Salted Sweet Corn', NULL, 55, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1853', 'Peri Peri Sweet Corn', NULL, 89, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1854', 'BBQ Sweet Corn', NULL, 79, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1855', 'Makhni Marinated Sweet Corn', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1857', 'Classic Veg Wrap', NULL, 119, true, true, 'SNACKS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1861', 'Mexican Salsa Wrap', NULL, 149, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1864', 'Italian Club Wrap', NULL, 139, true, true, 'SNACKS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1868', 'Spicy Paneer Wrap', NULL, 159, true, true, 'SNACKS', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1876', 'Veg Fried Rice', NULL, 129, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1879', 'Plain Maggie', NULL, 60, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1881', 'Double Masala Maggie', NULL, 70, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1883', 'Hot Passion Spicy Maggie', NULL, 79, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1884', 'Veg Masala Maggie', NULL, 99, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1885', 'Veg Schezwan Fried Rice', NULL, 169, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1888', 'Schezwan Triple Fried RIce', NULL, 199, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1889', 'Masala Makhani Maggie', NULL, 120, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1891', 'Peri Peri Masala Maggie', NULL, 120, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1893', 'Cheese Chatori Maggie', NULL, 109, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1914', 'Mint Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1915', 'Mary Lichi Mojiti', NULL, 49, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1916', 'Pineapple Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1917', 'Spicy Devil Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1918', 'Blue Heaven Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1919', 'Orange Cindrella Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1920', 'Strawberry Mojito', NULL, 89, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1922', 'Strawberry Shake', NULL, 129, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1926', 'Butter Scotch Shake', NULL, 169, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1927', 'Rich Chocolate Shake', NULL, 159, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1928', 'Oreo Chocolate Shake', NULL, 119, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1929', 'Kitkat Chocolate Shake', NULL, 129, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1930', 'Brownie Blast Shake', NULL, 179, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1931', 'Nutella Shake', NULL, 179, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1932', 'Premium Cold Coffee', NULL, 99, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1933', 'Strong Cold Coffee', NULL, 110, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1942', 'Lassi', NULL, 50, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1943', 'Chilli Paneer', NULL, 179, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1944', 'Paneer 65', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1945', 'Paneer Dragon', NULL, 189, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1946', 'Corn Chilli', NULL, 179, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1947', 'Corn Crispy', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1948', 'Veg Manchurian', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1949', 'Mashroom Chilli', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1950', 'Chinese Bhel', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1951', 'Gobhi Chilli', NULL, 139, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1952', 'Chana Chilli', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1953', 'Baby Corn Chilli', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1954', 'Potato Chilli', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1955', 'Honey Chilli Potato', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1956', 'Veg Crispy', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1957', 'Veg Crunchy', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1959', 'Veg Lolipop', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1960', 'Hakka Noodels', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1961', 'Schezwan Noddels', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1962', 'Chilli Garlic Noodels', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1967', 'Veg Bullet', NULL, 139, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1968', 'Special Chana Roast', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1969', 'Chocolate Sandwich', NULL, 109, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1970', 'Bombay Sandwich', NULL, 99, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1971', 'Cheese Corn Sandwich', NULL, 149, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1972', 'Nutella Sandwich', NULL, 149, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1973', 'Corn Maggie', NULL, 79, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1976', 'Maxican Sandwich', '3 Layer', 149, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1977', 'Paneer Makhani Sandwich', '3 Layer', 159, true, true, 'Sandwich', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1979', 'Arrabbiata Pasta( Red Sauce Pasta )', NULL, 149, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1982', 'Alfredo Pasta(White Sauce)', NULL, 179, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1983', 'Peri Peri Pasta', NULL, 159, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1985', 'Maggie Masala Pasta', NULL, 159, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1997', 'Cheese Garlic Breads', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-1999', 'Cheese Chilli Garlic Bread', NULL, 89, true, true, 'Sandwich', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2001', 'Superme Treat Garlic Bread', NULL, 99, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2003', 'Paneer Makhani Garlic Bread', NULL, 129, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2015', 'Papadi Chaat', NULL, 70, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2016', 'Tikki Chaat', NULL, 70, true, true, 'Chowpaty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2017', 'Raj Kachori', NULL, 80, true, true, 'Chowpaty', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2018', 'Sev Papadi', NULL, 80, true, true, 'Chowpaty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2019', 'Dahi Gupchup', NULL, 60, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2020', 'Panipuri', NULL, 20, true, true, 'Chowpaty', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2021', 'Bhel', NULL, 60, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2022', 'Pav Bhaji', NULL, 80, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2706', 'Veg. Chowmine', NULL, 140, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sahu ji momos center (legacy shop #60)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sahu-ji-momos-center-60',
    'Sahu ji momos center',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.3,
    6,
    20,
    30,
    1,
    79,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2118', 'Steamed Momos', '10 Pieces Of Momos', 30, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2119', 'Fried Momos', '10 Pieces Of Momos', 40, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2120', 'Chowmein', NULL, 30, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2121', 'Chilli Potato', NULL, 50, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2122', 'Chinese Pakoda', NULL, 20, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2123', 'French Fries', NULL, 20, true, true, 'Sahu Ji Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Punjab's Kitchen (legacy shop #61)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'punjab-s-kitchen-61',
    'Punjab''s Kitchen',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.2,
    9,
    20,
    30,
    2,
    396,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2035', 'Chicken Manchurian', NULL, 240, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2036', 'Chicken Chilli', NULL, 200, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2037', 'Chicken Garlic', NULL, 200, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2038', 'Chicken Ginger', NULL, 200, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2039', 'Chicken Schezwan', NULL, 180, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2041', 'Chicken Pakoda', NULL, 170, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2042', 'Chicken Lolipop', '4 piece', 200, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2045', 'Chicken Lolipop Gravy', NULL, 220, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2048', 'Chicken Roast', NULL, 220, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2055', 'Chicken Crispy', NULL, 220, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2057', 'Chicken65', NULL, 210, true, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2058', 'Chicken Kadi', NULL, 70, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2061', 'Omelette', NULL, 70, true, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2062', 'Boiled Egg', NULL, 15, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2063', 'Fry Egg', NULL, 50, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2064', 'Fish Roast', '2 Piece', 130, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2065', 'Chicken Tandoori', NULL, 250, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2070', 'Chicken Afgani Tikka', NULL, 290, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2080', 'Chicken Dum Biryani', NULL, 130, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2081', 'Chicken Dum Roast Biryani', NULL, 160, false, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2082', 'Chicken Matka Biryani', NULL, 160, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2083', 'Biryani Rice', NULL, 140, true, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2084', 'Fish Biryani', NULL, 150, false, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2085', 'Fish Roast Biryani', NULL, 160, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2086', 'Egg Bhurji', NULL, 60, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2087', 'Egg Bhurji Curry', NULL, 100, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2088', 'Egg Curry', NULL, 90, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2089', 'Chicken Curry', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2090', 'Chicken Dehati', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2091', 'Chicken Lapeta', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2092', 'Chicken Masala', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2093', 'Chicken Butter Masala', NULL, 150, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2094', 'Chicken Chatpata Masala', NULL, 150, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2095', 'Chicken Mughlai', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2096', 'Chicken Lahsuni', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2097', 'Chicken Adaraki', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2098', 'Chicken Kolhapuri', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2099', 'Chicken Hyderabadi', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2100', 'Chicken Kadhai', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2101', 'Chicken Handi', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2103', 'Chicken Bhuna', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2104', 'Chicken Do Pyaja', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2105', 'Chicken Lababdar', NULL, 260, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2106', 'Chicken Punjabi', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2107', 'Punjab''s Kitchen Special Chicken', NULL, 280, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2108', 'Fish Curry', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2109', 'Fish Masala', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2110', 'Chicken Fried Rice', NULL, 200, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2111', 'Chicken Schezwan Rice', NULL, 210, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2113', 'Chicken Ginger Rice', NULL, 220, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2114', 'Chicken Chilli Rice', NULL, 220, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2115', 'Egg Bhurji Rice', NULL, 150, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2116', 'Egg Fried Rice', NULL, 160, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2117', 'Egg Schezwan Rice', NULL, 170, false, true, 'Rice & Pulao', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2164', 'Papad Dry', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2165', 'Papad Fry', NULL, 25, true, true, 'Paneer', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2166', 'Green Salad', NULL, 70, true, true, 'Paneer', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2167', 'Papad Churmuri', NULL, 60, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2168', 'Family Salad', NULL, 110, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2169', 'Peanut Kachumber Salad', NULL, 120, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2170', 'Kachumber Salad', NULL, 60, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2171', 'Onion Salad', NULL, 30, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2172', 'Plain Raita', NULL, 50, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2173', 'Boondi Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2174', 'Onion Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2175', 'Mix Veg Raita', NULL, 70, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2176', 'Finger Chips', NULL, 100, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2177', 'Chana Roast', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2178', 'Aalu Chana Chaat', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2182', 'Corn Chaat', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2183', 'Plain Maggie', NULL, 50, true, true, 'Popular', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2184', 'Masala Maggie', NULL, 70, true, true, 'Popular', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2185', 'Cheese  Maggie', NULL, 80, true, true, 'Popular', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2186', 'Chole Bhature', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2187', 'Veg Noodle', NULL, 110, true, true, 'Popular', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2188', 'Veg Hakka Noodels', NULL, 130, true, true, 'Popular', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2189', 'Schezwan Noodle', NULL, 140, true, true, 'Popular', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2190', 'Noodle Soup', NULL, 90, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2191', 'Veg Manchow Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2192', 'Veg Lemon Coriander Soup', NULL, 90, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2193', 'Veg Hot & Sour Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2194', 'Veg Sweet Corn Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2195', 'Tomato Soup', NULL, 90, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2201', 'Paneer Chilli', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2202', 'Paneer 65', NULL, 210, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2203', 'Paneer Manchurian', NULL, 230, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2204', 'Paneer Dragon', NULL, 240, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2205', 'Veg Crispy', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2206', 'Corn Crispy', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2207', 'Corn Chilli', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2208', 'Chana Chilli', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2209', 'Chilli Potato', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2215', 'Honey Chilli Potato', NULL, 170, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2217', 'Mushroom Chilli', NULL, 190, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2220', 'Veg Lolipop', NULL, 220, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2221', 'Veg Manchurian', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2223', 'Chinese Bhel', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2226', 'Veg Seek  Kabab', NULL, 180, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2227', 'Hara-Bhara Kabab', NULL, 200, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2229', 'Paneer Tikka', NULL, 230, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2233', 'Paneer Achari Tikka', NULL, 250, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2237', 'Paneer Pudina Tikka', NULL, 240, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2238', 'Paneer Lasuni Tikka', NULL, 250, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2242', 'Paneer Reshmi Tikka', NULL, 250, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2244', 'Paneer Malai Tikka', NULL, 260, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2248', 'Mushroom Tikka', NULL, 220, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2249', 'Veg Kathi Tikka', NULL, 240, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2250', 'Veg Hydrabadi Tikka', NULL, 220, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2251', 'Soya Chaap', NULL, 220, true, true, 'Veg Tandoor Starter', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2252', 'Tandoori Roti', NULL, 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2253', 'Tandoori Butter Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2254', 'Tawa Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2255', 'Tawa Butter Roti', NULL, 20, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2256', 'Masala Kulcha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2257', 'Paneer Kulcha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2259', 'Plain Paratha', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2260', 'Aalu Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2261', 'Mix Veg Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2262', 'Paneer Paratha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2263', 'Lachha Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2264', 'Paneer Masala', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2265', 'Paneer Butter Masala', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2266', 'Paneer Chatpata Masala', NULL, 210, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2267', 'Matar Paneer Masala', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2268', 'Paneer Kadhai', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2269', 'Paneer Kolhapuri', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2270', 'Paneer Paitala', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2271', 'Paneer TIkka Masala', NULL, 250, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2272', 'Shahi Paneer', NULL, 250, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2273', 'Paneer Do Pyaja', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2274', 'Paneer lawabdaar', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2275', 'Paneer Punjabi', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2276', 'Paneer Bhurji', NULL, 230, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2277', 'Paneer Bhurji Gravy', NULL, 240, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2278', 'Palak Paneer', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2279', 'Methi Paneer', NULL, 220, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2280', 'Kaju Paneer', NULL, 250, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2281', 'Bhindi Masala', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2282', 'Bhindi Do Pyaja', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2283', 'Bhindi Crispy', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2284', 'Karela Masala', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2285', 'Karela Crispy', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2286', 'Plain Palak', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2287', 'Mix Veg', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2288', 'Kofta Curry', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2289', 'Malai Kofta', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2291', 'Veg Kolhapuri', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2292', 'Veg Kadhai', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2293', 'Veg Handi', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2294', 'Veg Haryali', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2295', 'Veg Amritsari', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2296', 'Aalu Bhurji', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2297', 'Aalu Jeera', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2298', 'Aalu Dam Punjab', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2299', 'Aalu Matar Masala', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2300', 'Aalo Gobhi', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2301', 'Sev Tamatar', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2302', 'Sev Bhaji', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2303', 'Gobhi Adaraki', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2304', 'Chana Masala', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2305', 'Chole Amritsari', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2306', 'Methi Matar Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2307', 'Mushroom Masala', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2308', 'Mushroom Kadhai', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2309', 'Mushroom Kolhapuri', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2310', 'Kaju Curry', NULL, 230, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2311', 'Daal Fry', NULL, 120, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2312', 'Daal Tadaka', NULL, 130, true, true, 'Daal', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2313', 'Butter Daal', NULL, 140, true, true, 'Daal', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2314', 'Plain Daal', NULL, 80, true, true, 'Daal', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2315', 'Daal Palak', NULL, 140, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2316', 'Daal Bhuna', NULL, 160, true, true, 'Daal', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2317', 'Steam Rice', NULL, 70, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2318', 'Jeera Rice', NULL, 90, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2319', 'Onion Tomato Rice', NULL, 110, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2320', 'Veg Pulao', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2321', 'Paneer Pulav', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2322', 'Lemon Pulao', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2323', 'Matar Pulao', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2324', 'Onion Garlic Rice', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2325', 'Daal Khichdi', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2326', 'Masala Rice', NULL, 120, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2327', 'Veg Biryani', NULL, 170, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2763', 'Paneer Masala', NULL, 100, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2764', 'Full Chicken Biryani Full', NULL, 250, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Bhavani Restaurant (legacy shop #62)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'bhavani-restaurant-62',
    'Bhavani Restaurant',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3,
    12,
    20,
    30,
    2,
    331,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2416', 'Tomato Soup', NULL, 90, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2417', 'Tomato Dhaniya Soup', NULL, 100, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2418', 'Manchow Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2419', 'Hot & Sour Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2420', 'Veg Sweet Corn Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2421', 'Veg Lemon Coriander Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2422', 'Veg Clear Soup', NULL, 110, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2423', 'Cream Of Mushroom Soup', NULL, 140, true, true, 'Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2424', 'Plain Cheese Sandwich', NULL, 70, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2425', 'Cheese Corn Sandwich', NULL, 90, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2426', 'Veg Grilled Sandwich', NULL, 80, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2427', 'Potato Grilled Sandwich', NULL, 90, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2428', 'Mexican Grilled Sandwich', NULL, 100, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2429', 'Chocolate Grilled Sandwich', NULL, 100, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2430', 'Veg Club Grilled Sandwich', NULL, 120, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2431', 'Paneer Grilled Sandwich', NULL, 120, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2432', 'Paneer Club Sandwich', NULL, 130, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2433', 'Veg Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2434', 'Plain Cheese Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2435', 'Corn Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2436', 'Dry Tomato Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2437', 'Mexican Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2438', 'Mushroom Tomato Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2439', 'Paneer Delight Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2440', 'Paneer Tikka Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2441', 'Paneer Chilli Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2442', 'Bhawani Special Pizza', NULL, 220, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2443', 'Garlic Bread', NULL, 89, true, true, 'Sandwich&Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2447', 'Red Sauce Pasta', NULL, 99, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2448', 'White Sauce Pasta', NULL, 119, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2449', 'Mix Sauce Pasta', NULL, 129, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2450', 'Plain Maggi', NULL, 60, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2451', 'Cheese Maggie', NULL, 90, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2452', 'Veg Maggie', NULL, 90, true, true, 'Maggi&Pasta', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2453', 'Peanut Fry', NULL, 99, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2454', 'Boiled Peanut', NULL, 109, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2455', 'Peanut Masala', NULL, 109, true, true, 'SNACKS', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2456', 'French Fries', NULL, 89, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2457', 'Masala French Fries', NULL, 109, true, true, 'SNACKS', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2458', 'Peri PeriFrench Fries', NULL, 109, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2459', 'Onion Pakoda', NULL, 89, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2460', 'Veg Pakoda', NULL, 99, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2461', 'Veg Cutlet', NULL, 99, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2462', 'Paneer Pakoda', NULL, 129, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2463', 'Paneer Cutlet', NULL, 139, true, true, 'SNACKS', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2464', 'Chana Roast', NULL, 149, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2466', 'Cheese Ball', NULL, 199, true, true, 'SNACKS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2467', 'Cheese Corn Ball', NULL, 199, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2468', 'Paneer Saute', NULL, 239, true, true, 'SNACKS', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2469', 'Shahi Petro', NULL, 249, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2470', 'Chana Chilli', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2471', 'Potato Chilli', NULL, 149, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2472', 'Honey Chilli Potato', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2473', 'Chinese Bhel', NULL, 139, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2474', 'Crispy Corn', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2475', 'Crispy Veg', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2476', 'Lovely Corn Chilli', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2477', 'Baby Corn Chilli', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2478', 'Veg Manchurian', NULL, 129, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2479', 'Veg Lolipop', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2480', 'Mushroom Chilli', NULL, 209, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2481', 'Mushroom 65', NULL, 219, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2482', 'Paneer Chilli', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2483', 'Paneer Schezwan', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2484', 'Paneer Salt And Pepper', NULL, 189, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2485', 'Paneer Manchurian', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2486', 'Veg Hakka Noodels', NULL, 149, true, true, 'Noodle', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2487', 'Schezwan Noodle', NULL, 149, true, true, 'Noodle', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2488', 'Chinese Noodles', NULL, 160, true, true, 'Noodle', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2489', 'Shanghai Noodles', NULL, 169, true, true, 'Noodle', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2490', 'Chili Garlic Noodles', NULL, 139, true, true, 'Noodle', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2491', 'Chinese Chopsuey', NULL, 269, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2492', 'American Chopsy', NULL, 190, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2493', 'Chole Bhature', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2494', 'Puri Bhaji', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2495', 'Veg Roll', NULL, 80, true, true, 'Rolls', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2496', 'Paneer Roll', NULL, 100, true, true, 'Rolls', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2497', 'Cheese Corn Roll', NULL, 100, true, true, 'Rolls', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2498', 'Idli Sambhar', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2499', 'Sambhar Vada', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2500', 'Plain Dosa', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2501', 'Masala Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2502', 'Cutting Masala Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2503', 'Butter Masala Dosa', NULL, 110, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2504', 'Onion Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2505', 'Paneer Dosa', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2506', 'Jini Dosa', NULL, 150, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2507', 'Mysore Masala Dosa', NULL, 150, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2508', 'Pizza Dosa', NULL, 150, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2509', 'Plain Uttapam', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2510', 'Onion Tomato Uttapam', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2511', 'Veg Uttapam', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2512', 'Onion Uttapam', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2513', 'Masala Uttapam', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2514', 'Plain Upma', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2515', 'Masala Upma', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2516', 'Hara-Bhara Kabab', NULL, 139, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2517', 'Veg Cheese Kabab', NULL, 159, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2518', 'Dahi Kabab', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2519', 'Corn Kabab', NULL, 169, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2520', 'Kaju Seekh Kabab', NULL, 180, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2521', 'Paneer Tikka', NULL, 210, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2522', 'Paneer Malai Tikka', NULL, 229, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2523', 'Paneer Reshmi Tikka', NULL, 250, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2524', 'Paneer Hariyali Tikka', NULL, 220, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2525', 'Pudina Tikka', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2526', 'Paneer Achari Tikka', NULL, 209, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2527', 'Roasted Papad', NULL, 15, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2528', 'Papad Fry', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2529', 'Masala Papad', NULL, 39, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2530', 'Onion Salad', NULL, 25, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2531', 'Green Salad', NULL, 59, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2532', 'Cucumber Salad', NULL, 59, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2533', 'Curd Onion Salad', NULL, 69, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2534', 'Curd', NULL, 40, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2535', 'Plain Raita', NULL, 50, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2536', 'Veg Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2537', 'Gobhi Aalu', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2538', 'Gobhi Matar', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2539', 'Aalu Jeera', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2540', 'Karela Pyaj', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2541', 'Sev Bhaji', NULL, 129, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2542', 'Sev Tomato', NULL, 129, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2543', 'Sev Masala', NULL, 149, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2544', 'Mix Veg', NULL, 149, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2545', 'Chana Masala', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2546', 'Bhindi Masala', NULL, 139, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2547', 'Dum Aalu', NULL, 149, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2548', 'Veg Kolhapuri', NULL, 169, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2549', 'Palak Corn', NULL, 159, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2550', 'Stuffed Tomato', NULL, 169, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2551', 'Veg Kofta', NULL, 179, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2552', 'Veg Jalfrezi', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2553', 'Veg Chulbuli', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2554', 'Paneer Masala', NULL, 189, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2555', 'Matar Paneer', NULL, 189, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2556', 'Palak Paneer', NULL, 189, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2557', 'Paneer Achari', NULL, 209, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2558', 'Paneer Kadhai', NULL, 209, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2559', 'Paneer Butter Masala', NULL, 209, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2560', 'Paneer Do Pyaja', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2561', 'Paneer Kofta', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2562', 'Paneer Punjabi', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2563', 'Paneer Lawabdaar', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2564', 'Paneer Hydrabadi', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2565', 'Shahi Paneer', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2566', 'Paneer Bhurji', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2567', 'Paneer Muglai', NULL, 239, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2568', 'Paneer Maratha', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2569', 'Paneer Bharta', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2570', 'Paneer Pasanda', NULL, 269, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2571', 'Paneer Makhan Malai', NULL, 269, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2572', 'Plain Rice', NULL, 89, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2573', 'Jeera Rice', NULL, 119, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2574', 'Dal Rice Mix', NULL, 149, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2575', 'Veg Pulao', NULL, 169, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2576', 'Kashmiri Pulao', NULL, 179, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2577', 'Green Pees Pulao', NULL, 149, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2578', 'Paneer Peas Pulao', NULL, 189, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2596', 'Veg Dum Biryani', NULL, 169, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2597', 'Veg Biryani', NULL, 169, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2598', 'Veg Hydrabadi Biryani', NULL, 179, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2599', 'Plain Daal', NULL, 89, true, true, 'Daal', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2600', 'Daal Fry', NULL, 119, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2601', 'Daal Jeera', NULL, 99, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2602', 'Daal Tadaka', NULL, 139, true, true, 'Daal', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2603', 'Daal Makhani', NULL, 169, true, true, 'Daal', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2604', 'Daal Mughlai', NULL, 199, true, true, 'Daal', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2606', 'Tawa Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2607', 'Tandoori Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2608', 'Tandoori Butter Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2609', 'Tawa Butter Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2610', 'Plain Naan', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2611', 'Butter Naan', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2612', 'Garlic Naan', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2613', 'Kashmiri Naan', NULL, 110, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2614', 'Plain Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2615', 'Aalu Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2616', 'Gobhi Paratha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2617', 'Paneer Paratha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2618', 'Lachha Paratha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2619', 'Missi Roti', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2620', 'Plain Kulcha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2621', 'Masala Kulcha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2622', 'Cheese Kulcha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2623', 'Stuffed Kulcha', NULL, 80, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2624', 'Rabdi', NULL, 50, true, true, 'Dessert', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2625', 'Rashgulla', NULL, 40, true, true, 'Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2626', 'Gulab Jamun', NULL, 40, true, true, 'Dessert', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2803', 'Dal Khichdi', NULL, 149, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- GOODWILL THE CAKE SHOP (legacy shop #63)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'goodwill-the-cake-shop-63',
    'GOODWILL THE CAKE SHOP',
    'Foods  Bakery',
    false,
    true,
    'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Desserts'],
    4,
    22,
    20,
    30,
    3,
    462,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2328', 'Rasmalai Cake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2330', 'Feeling Pineapple Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2331', 'Feeling BlueBerry', NULL, 400, true, true, 'Cake', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2332', 'Mix Fruit Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2333', 'Red Velvet Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2334', 'Strawberry Cake', NULL, 280, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2335', 'Pineapple Cake', NULL, 280, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2336', 'Black Currant Cake', NULL, 280, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2337', 'Paan Flavour Cake', NULL, 280, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2338', 'Black Forest Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2339', 'White Forest Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2340', 'Chocolate Fantasy Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2341', 'Chocolate Delight', NULL, 330, true, true, 'Cake', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2342', 'Chocolate Strange Cake', NULL, 330, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2343', 'Chocolate Zebra Cake', NULL, 330, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2344', 'Chocolate Priyam Delight Cake', NULL, 380, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2345', 'Chocolate Fuge Cake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2346', 'Chocolate Chocochips Cake', NULL, 500, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2347', 'Chocolate Kitkat', NULL, 380, true, true, 'Cake', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2348', 'Chocolate Oreo Cake', NULL, 380, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2349', 'Chocolate Roasted Almond Cake', NULL, 500, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2350', 'Chocalate Truffle Cake', NULL, 500, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2351', 'Chocolate Crunchy Cake', NULL, 380, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2352', 'Chocobar Cake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2354', 'Pineapple Cake Pastry', NULL, 50, true, true, 'Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2355', 'Butterscotch Cake Pastry', NULL, 60, true, true, 'Pastry', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2356', 'Choco Truffle Pastry', NULL, 70, true, true, 'Pastry', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2357', 'Rasmalai Cake Pastry', NULL, 70, true, true, 'Pastry', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2358', 'Red Velvet Cake Pastry', NULL, 70, true, true, 'Pastry', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2359', 'Black Forest Cake Pastry', NULL, 60, true, true, 'Pastry', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2360', 'Chocolate Delight Pastry', NULL, 60, true, true, 'Pastry', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2361', 'Lotus Biscoff Cheese Cake Pastry', NULL, 170, true, true, 'Cheese Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2362', 'Blueberry Cheese Pastry', NULL, 110, true, true, 'Cheese Pastry', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2363', 'Vanilla Cup Cake', NULL, 30, true, true, 'Cup Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2364', 'Chocalate Cup Cake', NULL, 40, true, true, 'Cup Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2365', 'Red Velvet Cup Cake', NULL, 40, true, true, 'Cup Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2366', 'Chocolate Brownie', NULL, 90, true, true, 'Dry Cake', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2367', 'Choco lava Cake', NULL, 50, true, true, 'Dry Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2368', 'Chocolate Donut', NULL, 50, true, true, 'Dry Cake', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2369', 'Rumball', NULL, 30, true, true, 'Dry Cake', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2370', 'Chocolate Cream Roll', NULL, 30, true, true, 'Cream Roll', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2371', 'Vanila Cream Roll', NULL, 25, true, true, 'Cream Roll', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2372', 'Plain Pizza', NULL, 129, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2373', 'Margherita Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2374', 'Bombay Masala Pizza', NULL, 160, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2375', 'Corn Tomato Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2376', 'Veggie Lovers Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2377', 'Cheese Bust Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2378', 'Italian Veggi Special Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2379', 'Tandoori Paneer Pizza', NULL, 200, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2380', 'Goodwill Special Pizza', NULL, 240, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2381', 'Testy Tosty Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2382', 'Cheese Chatani Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2383', 'Chocolate Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2384', 'Veg Maharaja Sandwich', NULL, 130, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2385', 'Bombay Masala Toast Sandwich', NULL, 129, true, true, 'Sandwich', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2386', 'Cottage Cheese Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2387', 'Paneer Delicious Sandwich', NULL, 145, true, true, 'Sandwich', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2388', 'Goodwill Sandwich', NULL, 150, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2389', 'Aalu Patties', NULL, 30, true, true, 'SNACKS', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2390', 'Paneer Patties', NULL, 35, true, true, 'SNACKS', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2391', 'Aalu Cheese Patties', NULL, 40, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2392', 'Paneer Cheese Patties', NULL, 45, true, true, 'SNACKS', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2393', 'Smiley', NULL, 80, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2394', 'Cheese Ball', NULL, 85, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2395', 'French Fries', NULL, 90, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2396', 'Veggie Nuggets', NULL, 90, true, true, 'SNACKS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2397', 'Peri Peri Fries', NULL, 100, true, true, 'SNACKS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2398', 'Plain Maggi', NULL, 60, true, true, 'Maggie', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2399', 'Veggies Maggie Masala', NULL, 70, true, true, 'Maggie', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2400', 'Cheese Corn Maggie', NULL, 90, true, true, 'Maggie', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2401', 'Schezwan Maggie Masala', NULL, 90, true, true, 'Maggie', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2402', 'Paneer Maggie Masala', NULL, 100, true, true, 'Maggie', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2403', 'Masala Cold Drink', NULL, 60, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2404', 'Fresh Lemon Soda', NULL, 70, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2405', 'Water Melon Mojito', NULL, 80, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2406', 'Mango Milk shake', NULL, 90, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2407', 'Cold Coffe', NULL, 90, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2408', 'Blue Logan', NULL, 90, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2409', 'Cold Coffe With Ice Cream', NULL, 100, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2410', 'Chocolate Shake', NULL, 99, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2411', 'Strawberry Shake', NULL, 99, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2412', 'Kitkat Chocolate Shake', NULL, 109, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2413', 'Oreo Chocolate Shake', NULL, 119, true, true, 'Goodwill Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2628', 'Chocolate Vanilla Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2629', 'Vanilla Pineapple Basket Cake', NULL, 380, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2630', 'Chocolate GemsCake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2796', 'Butterscotch Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2797', 'Rasmalai cake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- FOOD PLAZA BAKERY (legacy shop #64)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'food-plaza-bakery-64',
    'FOOD PLAZA BAKERY',
    'cakes and bakery',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3,
    15,
    25,
    35,
    2,
    399,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2127', 'Chocolate Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2128', 'Strawberry Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2129', 'Chocolate Chocochips Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2130', 'Oreo Chocolate Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2131', 'Pineapple Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2132', 'Black Forest Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2133', 'White Forest Cake', NULL, 300, true, true, 'Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2134', 'Rasmalai Cake', NULL, 450, true, true, 'Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2135', 'Mix Fruit Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2136', 'Tutti Fruti Cake', NULL, 350, true, true, 'Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2138', 'Strawberry Mini Cake', NULL, 200, true, true, 'Mini Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2139', 'Chocolate MIni Cake', NULL, 200, true, true, 'Mini Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2143', 'Besan Modak', NULL, 120, true, true, 'Modak', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2144', 'Motichoor Modak', NULL, 120, true, true, 'Modak', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2145', 'Khoya Modak', NULL, 120, true, true, 'Modak', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2146', 'Black Forest Mini Cake', NULL, 220, true, true, 'Mini Cake', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2147', 'White Forest Mini Cake', NULL, 220, true, true, 'Mini Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2148', 'Tutti Fruti Mini Cake', NULL, 220, true, true, 'Mini Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2149', 'Pineapple Mini Cake', NULL, 220, true, true, 'Mini Cake', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2150', 'Aalu Patties', NULL, 20, true, true, 'Patties', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2151', 'Paneer Patties', NULL, 30, true, true, 'Patties', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2152', 'Chocolate Cake Pastry', NULL, 50, true, true, 'Pastry', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2153', 'Tutti Fruti Cake Pastry', NULL, 50, true, true, 'Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2154', 'Butterscotch Cake Pastry', NULL, 50, true, true, 'Pastry', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2155', 'Pineapple Cake Pastry', NULL, 50, true, true, 'Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2156', 'Lotus Biscoff Cheese Cake Pastry', NULL, 100, true, true, 'Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2157', 'Plain Cheese Cake Pastry', NULL, 70, true, true, 'Pastry', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2158', 'Mawa Cake', NULL, 150, true, true, 'Dry Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2159', 'Mawa Cake', NULL, 60, true, true, 'Dry Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2160', 'Milk Bread', NULL, 35, true, true, 'Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2161', 'Brown Bread', NULL, 40, true, true, 'Bread', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2162', 'Pav Bread', NULL, 25, true, true, 'Bread', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2163', 'Family Bread', NULL, 50, true, true, 'Bread', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2997', 'Chocolate Brownie', NULL, 60, true, true, 'Dry Cake', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2998', 'Choco lava Cake', NULL, 50, true, true, 'Dry Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2999', 'Cream Roll', NULL, 60, true, true, 'Candy & Roll', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3000', 'Guava Candy', NULL, 145, true, true, 'Candy & Roll', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3001', 'Bubble Gum Candy', NULL, 145, true, true, 'Candy & Roll', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3002', 'Slice Cake', NULL, 60, true, true, 'Dry Cake', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3003', 'Cream Bun', NULL, 15, true, true, 'Dry Cake', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3004', 'Cornflake Cookies', NULL, 150, true, true, 'Cookies', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3005', 'Kaju Badam Cookies', NULL, 250, true, true, 'Cookies', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3006', 'Peanut Cookies', NULL, 160, true, true, 'Cookies', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- JUICE FARM (legacy shop #65)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'juice-farm-65',
    'JUICE FARM',
    'juices',
    false,
    false,
    'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    184,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2636', 'Banana Shake', NULL, 60, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2637', 'Banana Rose Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2638', 'Choco Banana Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2640', 'Oreo Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2641', 'Chocolate Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2642', 'Strawberry Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2643', 'Mango Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2644', 'Chiku Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2645', 'Chiku Choco Shake', NULL, 75, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2646', 'Shitafal Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2648', 'Cold Coffe', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2649', 'Guava Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2650', 'Rose Vanilla Shake', NULL, 70, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2651', 'Salted French Fries', NULL, 60, true, true, 'French Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2652', 'Peri Peri Fries', NULL, 60, true, true, 'French Fries', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2660', 'Club Sandwich', NULL, 60, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2661', 'Veg Grilled Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2662', 'Cheese Corn Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2663', 'Cheese Butter Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2664', 'Fruit Jam Sandwich', NULL, 60, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2665', 'Chatpata Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2666', 'Chocolate Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2667', 'Cheese Chocolate Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2668', 'Veg Cheese Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2669', 'Veg Mayo Burger', NULL, 70, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2670', 'Tandoori Mayo Burger', NULL, 70, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2671', 'Plain Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2672', 'Butter Meggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2673', 'Cheese Corn Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2674', 'Schezwan Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2675', 'Vegetable Maggi', NULL, 60, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2676', 'Night Over', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2677', 'Masala Cola', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2678', 'Blue Lagoon', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2679', 'Green Heavan', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2680', 'Mojito', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2681', 'Shikanji Soda', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2682', 'Green Mango Soda', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2683', 'Rose Soda', NULL, 60, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2684', 'Cheese Pizza', NULL, 110, true, true, 'PIZZA', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2685', 'Onion Pizza', NULL, 110, true, true, 'PIZZA', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2686', 'Golden Corn Pizza', NULL, 110, true, true, 'PIZZA', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2687', 'Tomato Pizza', NULL, 110, true, true, 'PIZZA', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2688', 'Capsicum Pizza', NULL, 110, true, true, 'PIZZA', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2689', 'BBQ Paneer Pizza', NULL, 120, true, true, 'PIZZA', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2690', 'Paneer Tikka Pizza', NULL, 140, true, true, 'PIZZA', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Chotu Paratha Center (legacy shop #67)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'chotu-paratha-center-67',
    'Chotu Paratha Center',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['North Indian'],
    5,
    0,
    20,
    30,
    1,
    125,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2693', 'Plain Paratha', NULL, 20, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2695', 'Pyaaz Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2696', 'Paneer Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2697', 'Tawa Roti', NULL, 6, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2699', 'Plain Rice', NULL, 60, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2700', 'Daal Fry', NULL, 70, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2701', 'Sabzi', NULL, 70, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2702', 'Veg Thali', NULL, 90, true, true, 'Thali', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2804', 'Allu paratha', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Yaroon Da Aada (legacy shop #69)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'yaroon-da-aada-69',
    'Yaroon Da Aada',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.9,
    9,
    20,
    30,
    1,
    192,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2711', 'Margherita Pizza', NULL, 95, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2712', 'Cheese Corn Pizza', NULL, 109, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2713', 'Paneer Pizza', NULL, 109, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2714', 'Mexican Pizza', NULL, 119, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2715', 'Personalized Pizza', NULL, 99, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2716', 'Yaaron Da Adda Special Pizza', NULL, 155, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2718', 'Mayo Sandwich', NULL, 45, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2719', 'Cheese Corn Sandwich', NULL, 65, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2720', 'Chocolate Sandwich', NULL, 55, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2721', 'Paneer Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2722', 'Mexican Sandwich', NULL, 65, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2724', 'Yaaron Da Adda Special Sandwich', NULL, 109, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2727', 'Mix Sauce Pasta', NULL, 80, true, true, 'Pasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2728', 'Salt & Paper Fries', NULL, 45, true, true, 'Fries', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2729', 'Peri Peri Fries', NULL, 55, true, true, 'Fries', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2730', 'Cheese  Fries', NULL, 80, true, true, 'Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2733', 'Schezwan Noddels', NULL, 65, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2735', 'Paneer Chilli', NULL, 99, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2737', 'Manchurian', NULL, 65, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2738', 'Crispy Corn', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2739', 'Chana Roast', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2740', 'Veg Roll', NULL, 45, true, true, 'Chinese', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2742', 'Paneer Cheese Roll', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2745', 'Sechzwan Fried Rice', NULL, 90, true, true, 'Rice', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2746', 'Veg Fried Rice', NULL, 80, true, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2747', 'Tikki Burger', NULL, 45, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2748', 'Veggie Burger', NULL, 55, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2749', 'Mexican Burger', NULL, 65, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2751', 'Plain Maggi', NULL, 35, true, true, 'Maggie', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2752', 'Veg Masala Maggie', NULL, 55, true, true, 'Maggie', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2753', 'Chesse Corn Maggie', NULL, 65, true, true, 'Maggie', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2754', 'Mexican Maggie', NULL, 65, true, true, 'Maggie', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2756', 'Special Cold Coffee', NULL, 80, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2757', 'Chocolate Shake', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2758', 'Mango Shake', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2760', 'Kitkat  Shake', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2761', 'Oreo Shake', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3019', 'Garlic Maggi', NULL, 60, true, true, 'Maggie', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3020', 'Garlic Maggi', NULL, 60, true, true, 'Maggie', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- TASTY BITES (legacy shop #70)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'tasty-bites-70',
    'TASTY BITES',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4,
    0,
    20,
    30,
    1,
    NULL,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
)
SELECT id FROM upsert_restaurant;

-- Shere Punjab Dhaba (legacy shop #73)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'shere-punjab-dhaba-73',
    'Shere Punjab Dhaba',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    2.3,
    4,
    30,
    40,
    2,
    278,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2806', 'Chicken Curry', NULL, 110, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2807', 'Chicken Masala', NULL, 140, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2808', 'Chicken Butter Masala', NULL, 140, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2809', 'Fish Curry', NULL, 100, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2810', 'Fish Dahi Masala', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2811', 'Egg Curry', NULL, 80, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2812', 'Egg Bhurji Curry', NULL, 80, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2813', 'Egg Masala', NULL, 90, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2814', 'Chicken Roast', NULL, 120, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2815', 'Chicken Chilli', NULL, 250, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2816', 'Fish Roast', NULL, 120, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2817', 'Omelette', NULL, 50, true, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2818', 'Egg Poach', NULL, 20, false, true, 'Non Veg-Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2819', 'Chicken Biryani', NULL, 120, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2820', 'Chicken Roast Biryani', NULL, 150, false, true, 'Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2821', 'Egg Biryani', NULL, 160, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2822', 'Paneer Matar', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2823', 'Paneer Butter Masala', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2824', 'Paneer Masala', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2825', 'Palak Paneer', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2826', 'Gobhi Matar', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2827', 'Gobhi Aalu', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2828', 'Chana Masala', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2829', 'Bhindi Pyaj', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2830', 'Sev Tamatar', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2831', 'Sev Bhaji', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2832', 'Tamater Chutney', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2833', 'Mix Veg', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2834', 'Paneer Bhurji Curry', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2835', 'Paneer Bhurji', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2836', 'Dal Fry', NULL, 100, true, true, 'Daal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2837', 'Dal Tadka', NULL, 120, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2838', 'Dal Palak', NULL, 130, true, true, 'Daal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2839', 'Daal Butter Fry', NULL, 130, true, true, 'Daal', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2840', 'Daal Khichdi', NULL, 180, true, true, 'Daal', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2841', 'Chana Roast', NULL, 140, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2842', 'Chana Chili', NULL, 170, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2843', 'Lahsun Chana Roast', NULL, 160, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2844', 'Paneer Chilli', NULL, 200, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2845', 'Paneer Roast', NULL, 220, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2846', 'Tandoori Roti', NULL, 10, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2847', 'Tandoori Butter Roti', NULL, 20, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2848', 'Plain Rice', NULL, 60, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2849', 'Jeera Rice', NULL, 100, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2850', 'Masala Rice', NULL, 120, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2851', 'Gobhi Rice', NULL, 160, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2852', 'Matar Rice', NULL, 110, true, true, 'Rice & Roti', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2853', 'Papad Dry', NULL, 15, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2854', 'Papad Fry', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2855', 'Papad Masala', NULL, 30, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2856', 'Green Salad', NULL, 90, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2857', 'Chukundar Salad', NULL, 90, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Maa Sherawali Chaat & Dosa Corner (legacy shop #76)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'maa-sherawali-chaat-dosa-corner-76',
    'Maa Sherawali Chaat & Dosa Corner',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['South Indian'],
    3.7,
    3,
    20,
    30,
    1,
    71,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2864', 'Tikki Chaat', NULL, 30, true, true, 'Chowpaty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2866', 'Bhel Puri', NULL, 30, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2867', 'Gupchup', '8 Piece', 20, true, true, 'Chowpaty', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2868', 'Dahi Gupchup', '7 Piece', 20, true, true, 'Chowpaty', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2869', 'Masala Dosa', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2871', 'Uttapam', NULL, 30, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- JHARNA DAIRY (legacy shop #77)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'jharna-dairy-77',
    'JHARNA DAIRY',
    'Dairy Products',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4,
    1,
    20,
    30,
    2,
    254,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2872', 'MILK', NULL, 50, true, true, 'DAIRY', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2873', 'KHATTA DAHI', NULL, 50, true, true, 'DAIRY', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2874', 'TAJA DAHI', NULL, 70, true, true, 'DAIRY', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2875', 'PANEER', NULL, 80, true, true, 'DAIRY', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2876', 'KHOVA', NULL, 80, true, true, 'DAIRY', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2877', 'DESI COW GHEE', NULL, 400, true, true, 'DAIRY', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2878', 'FROZEN MATAR(PEAS)', NULL, 40, true, true, 'DAIRY', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2879', 'DESI PEDA', NULL, 100, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2880', 'BARFI', NULL, 100, true, true, 'Sweets', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2881', 'KALAKAND', NULL, 110, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2882', 'BESAN LADDU', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2883', 'MOTICHOOR LADDU', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2884', 'KHOPRA LADDU', NULL, 80, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- MORYA DABELI CENTRE (legacy shop #78)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'morya-dabeli-centre-78',
    'MORYA DABELI CENTRE',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4,
    2,
    20,
    30,
    1,
    115,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2885', 'Sandwich', NULL, 55, true, true, 'Chowpaty', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2886', 'Burger', NULL, 55, true, true, 'Chowpaty', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2887', 'Dabeli', NULL, 30, true, true, 'Chowpaty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2888', 'Cheese Dabeli', NULL, 55, true, true, 'Chowpaty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3067', 'Vada Pav', NULL, 35, true, true, 'Chowpaty', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Arshi's Kitchen (legacy shop #79)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'arshi-s-kitchen-79',
    'Arshi''s Kitchen',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    2.4,
    10,
    20,
    30,
    2,
    271,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2894', 'Plain Dosa', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2895', 'Masala Dosa', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2896', 'Cutting Dosa', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2897', 'Paneer Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2898', 'Butter Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2905', 'Uttapam', NULL, 50, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2910', 'Veg Chowmein', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2911', 'Paneer Chowmein', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2912', 'Manchurian Chowmein', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2913', 'Hakka Noodels', NULL, 129, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2914', 'Veg chowmin', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2915', 'Schezwan Chowmein', NULL, 109, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2917', 'Manchurian', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2918', 'Paneer Chilli', NULL, 179, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2919', 'Chana Chili', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2923', 'Corn Crispy', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2924', 'Veg Crispy Corn', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2925', 'Veg Burger', NULL, 60, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2927', 'Paneer Burger', NULL, 80, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2928', 'Cheese Burger', NULL, 80, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2929', 'Veg Grilled Sandwich', NULL, 70, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2930', 'Cheese Sandwich', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2931', 'Maxican Sandwich', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2932', 'Chocolate Sandwich', NULL, 100, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2933', 'Bombay Sandwich', NULL, 80, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2934', 'Paneer Sandwich', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2974', 'Veg Fried Rice', NULL, 89, true, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2975', 'Paneer Fried RIce', NULL, 110, true, true, 'Rice', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2977', 'Sechzwan Fried Rice', NULL, 99, true, true, 'Rice', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3021', 'Margherita Pizza', NULL, 139, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3022', 'Veg Pizza', NULL, 150, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3023', 'Onion Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3024', 'Mexican Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3025', 'Cheese Corn Pizza', NULL, 199, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3026', 'Paneer Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3027', 'Double Cheese Pizza', NULL, 219, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3028', 'Paneer Blast Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3029', 'Garlic Bread', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3030', 'Cheese Corn Sandwich', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3031', 'Chowmein Burger', NULL, 70, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3032', 'Corn Burger', NULL, 70, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3033', 'Mexican Burger', NULL, 80, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3034', 'Jumbo Burger', NULL, 100, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3035', 'Peri Peri Burger', NULL, 90, true, true, 'Sandwich&Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3036', 'Finger Chips/ French Fries', NULL, 70, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3037', 'Chilli Potato', NULL, 129, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3038', 'Honey Chilli Potato', NULL, 150, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3039', 'Chana Roast', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3040', 'Peri Peri Fries', NULL, 80, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3041', 'Manchurian Rice', NULL, 110, true, true, 'Rice', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3045', 'Plain Maggi', NULL, 49, true, true, 'Maggie', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3046', 'Masala Maggi', NULL, 69, true, true, 'Maggie', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3047', 'Schezwan Maggi', NULL, 79, true, true, 'Maggie', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3048', 'Cheese Maggie', NULL, 90, true, true, 'Maggie', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3049', 'Cheese Butter Maggi', NULL, 99, true, true, 'Maggie', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3050', 'Paneer Maggie', NULL, 89, true, true, 'Maggie', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3051', 'Veg Momos', NULL, 40, true, true, 'Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3052', 'Fried Momos', NULL, 50, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3053', 'Chinese Pakoda', NULL, 55, true, true, 'Momos', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3054', 'Aloo Paratha', NULL, 40, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3055', 'Gobhi Paratha', NULL, 50, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3056', 'Paneer Paratha', NULL, 60, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3059', 'Combo 149', '1 Veg Burger+1 French Fries+1 Veg Momos', 149, true, true, 'Special Combo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3060', 'Combo 249', NULL, 249, true, true, 'Special Combo', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3062', 'Combo 449', NULL, 449, true, true, 'Special Combo', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3249', 'Daal fry', NULL, 89, true, true, 'Rice', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3250', 'Daal tadka', NULL, 90, true, true, 'Rice', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3251', 'Tawa roti', NULL, 10, true, true, 'Rice', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3252', 'Matar paneer', NULL, 180, true, true, 'Rice', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3253', 'Chana masala', NULL, 89, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3254', 'Paneer masala', NULL, 190, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3255', 'Paneer butter masala', NULL, 199, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3256', 'Sev bhaji', NULL, 99, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3257', 'Aalu gobhi', NULL, 80, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3258', 'Jeera rice', NULL, 79, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3434', 'Thali', '3 Roti 2sabji, daal, chawal,achar, salad, papad', 90, true, true, 'Special Combo', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sonu Biryani (legacy shop #82)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sonu-biryani-82',
    'Sonu Biryani',
    'Biryani',
    false,
    false,
    'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Biryani'],
    4.3,
    3,
    20,
    30,
    1,
    154,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-2991', 'Chicken Biryani', NULL, 100, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2992', 'Chicken Chawal', NULL, 70, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2993', 'Chicken Kadi', NULL, 40, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2994', 'Chicken Leg Piece', NULL, 50, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2995', 'Chicken Pot Kaleji', NULL, 60, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-2996', 'Chicken Lolipop', '3 piece', 50, false, true, 'Sonu Biryani', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Hotel Garuda and Resturant (legacy shop #113)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'hotel-garuda-and-resturant-113',
    'Hotel Garuda and Resturant',
    'Indian Chinese',
    false,
    true,
    'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Chinese'],
    2,
    2,
    30,
    40,
    2,
    291,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3070', 'Plain Dal', NULL, 70, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3071', 'Dal Jeera', NULL, 80, true, true, 'Daal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3072', 'Dal Fry', NULL, 90, true, true, 'Daal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3073', 'Dal Tadka', NULL, 100, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3074', 'Daal Butter Fry', NULL, 100, true, true, 'Daal', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3075', 'Dal Punjabi', NULL, 110, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3076', 'Tandoori Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3077', 'Butter Tandoori Roti', NULL, 15, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3078', 'Tawa Roti', NULL, 10, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3079', 'Tawa Butter Roti', NULL, 12, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3080', 'Plain Naan', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3081', 'Butter Naan', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3082', 'Aalu Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3083', 'Plain Paratha', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3084', 'Gobhi Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3085', 'Onion Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3086', 'Mix Veg Paratha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3087', 'Paneer Paratha', NULL, 60, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3088', 'Plain Kulcha', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3089', 'Masala Kulcha', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3090', 'Garlic Naan', NULL, 50, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3091', 'Kashmiri Naan', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3092', 'Laccha Paratha', NULL, 30, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3093', 'Cheese Paratha', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3094', 'Lachha Cheese Paratha', NULL, 70, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3095', 'Plain Rice', NULL, 70, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3096', 'Jeera Rice', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3097', 'Veg Pulao', NULL, 110, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3098', 'Green Matar Pulao', NULL, 110, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3099', 'Paneer Pulao', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3100', 'Veg Biryani', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3101', 'Veg Handi Biryani', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3102', 'Veg Hydrabadi Biryani', NULL, 150, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3103', 'Kashmiri Biryani', NULL, 130, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3104', 'Special Biryani', NULL, 140, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3105', 'Lemon Rice', NULL, 110, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3106', 'Curd Rice', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3107', 'Tomato Onion Jeera Rice', NULL, 100, true, true, 'Rice & Pulao', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3108', 'Rashgulla', NULL, 30, true, true, 'Sweets', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3109', 'Gulab Jamun', NULL, 40, true, true, 'Sweets', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3110', 'Paneer Masala', NULL, 170, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3111', 'Matar Paneer', NULL, 170, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3112', 'Palak Paneer', NULL, 170, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3113', 'Paneer Butter Masala', NULL, 170, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3114', 'Paneer Corn Masala', NULL, 170, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3115', 'Shahi Paneer', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3116', 'Mushroom Paneer', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3117', 'Paneer Kadhai', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3118', 'Paneer Kolhapuri', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3119', 'Paneer Handi', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3120', 'Paneer Adraki', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3121', 'Paneer Kurkure', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3122', 'Paneer Do Pyaja', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3123', 'Paneer Achari', NULL, 180, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3124', 'Paneer Achari Masala', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3125', 'Kaju Paneer', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3126', 'Paneer Lazeez', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3127', 'Paneer Kasturi', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3128', 'Paneer Punjabi', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3129', 'Paneer Kofta', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3130', 'Paneer Kaleji', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3131', 'Paneer Hydrabadi', NULL, 190, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3132', 'Paneer Rogan Josh', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3133', 'Paneer Bhurji', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3134', 'Paneer Takatak', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3135', 'paneer Tikka', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3136', 'Paneer TIkka Masala', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3137', 'Paneer Patiyala', NULL, 200, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3138', 'Plain Palak', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3139', 'Aloo Matar', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3140', 'Sev Tamatar', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3141', 'Aloo Jeera', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3142', 'Aloo Methi', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3143', 'Tamater Chutney', NULL, 110, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3144', 'Matar Masala', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3145', 'Karela Masala', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3146', 'Mix Veg', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3147', 'Aloo Gobhi Matar', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3148', 'Chana Masala', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3149', 'Baigan Bharta', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3150', 'Gobhi Masala', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3151', 'Karela Roast', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3152', 'Bhindi Masala', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3153', 'Bhindi Kurkure', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3154', 'Bhindi Do Pyaja', NULL, 130, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3155', 'Aloo Palak Matar', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3156', 'Palak Corn', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3157', 'Veg Kofta', NULL, 160, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3158', 'Hariyali Kofta', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3159', 'Veg Kadai', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3160', 'Veg Handi', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3161', 'Veg Kolhapuri', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3162', 'Stuffed Tomato', NULL, 140, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3163', 'Dum Aloo', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3164', 'Kaju Kari', NULL, 200, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3165', 'Kaju Handi', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3166', 'Veg Jaipuri', NULL, 150, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3167', 'Paneer Gobhi Masala', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3168', 'Mushroom Handi', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3169', 'Mushroom Kadhai', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3170', 'Mushroom Malai', NULL, 190, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3171', 'Idli Sambhar', NULL, 20, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3172', 'Plain Dosa', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3173', 'Masala Dosa', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3174', 'Butter Masala Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3175', 'Cutting Masala Dosa', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3176', 'Paneer Masala Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3177', 'Shahi Paneer', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3178', 'Cheese Masala Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3179', 'Paper Masala Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3180', 'Special Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3181', 'Veg Uttapam', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3182', 'Sambhar Vada', NULL, 40, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3183', 'Veg Cheese Burger', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3184', 'Cheese Corn Burger', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3185', 'Finger Chips', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3186', 'Peri Peri Fries', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3187', 'Veg Cutlet', NULL, 70, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3188', 'Veg Pakoda', NULL, 80, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3189', 'Veg Kabab', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3190', 'Hara Bhara Kabab', NULL, 130, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3191', 'Chole Bhature', NULL, 80, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3192', 'Chana Roast', NULL, 120, true, true, 'Veg-Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3193', 'Plain Cheese Sandwich', NULL, 40, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3194', 'Veg Grilled Sandwich', NULL, 80, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3195', 'Cheese Corn Sandwich', NULL, 80, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3196', 'Paneer Sandwich', NULL, 90, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3197', 'Mexican Sandwich', NULL, 90, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3198', 'Bombay Masala Sandwich', NULL, 100, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3199', 'Chocolate Sandwich', NULL, 100, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3200', 'Plain Pizza', NULL, 130, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3201', 'Veg Cheese Pizza', NULL, 150, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3202', 'Paneer Cheese Pizza', NULL, 160, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3203', 'Mexican Pizza', NULL, 170, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3204', 'Mushroom Pizza', NULL, 170, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3205', 'Exotic Veggies Pizza', NULL, 170, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3206', 'Special Pizza', NULL, 200, true, true, 'Pizza & Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3207', 'Veg Soup', NULL, 60, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3208', 'Tomato Soup', NULL, 70, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3209', 'Veg Manchow Soup', NULL, 60, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3210', 'Hot & Sour Soup', NULL, 90, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3211', 'Mushroom Soup', NULL, 80, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3212', 'Boondi Raita', NULL, 50, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3213', 'Veg Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3214', 'Plain Raita', NULL, 40, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3215', 'Fruit Raita', NULL, 90, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3216', 'Pineapple Raita', NULL, 90, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3217', 'Plain Curd', NULL, 20, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3218', 'Veg Chowmein', NULL, 110, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3219', 'Paneer Chowmein', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3220', 'Hakka Noodels', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3221', 'Paneer Chilli', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3222', 'Gobhi Chilli', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3223', 'Gobhi Manchurian', NULL, 150, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3224', 'Veg Fried Rice', NULL, 120, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3225', 'Sechzwan Fried Rice', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3226', 'Mushroom Chilli', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3227', 'Chana Chili', NULL, 140, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3228', 'Veg Crispy', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3229', 'Corn Chilli', NULL, 150, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3230', 'Corn Crispy', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3231', 'Lovely Corn', NULL, 160, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3232', 'Baby Corn Chilli', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3233', 'Paneer Manchurian', NULL, 150, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3234', 'Chinese Bhel', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3235', 'Veg Lolipop', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3236', 'Potato Chilli', NULL, 130, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3237', 'Schezwan Paneer', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3238', 'Paneer 65', NULL, 170, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3239', 'Cheese Corn Ball', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3240', 'Manchurian Rice', NULL, 140, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3241', 'Singapore Rice', NULL, 140, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3242', 'Veg Triple Fried Rice', NULL, 180, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3243', 'Papad Dry', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3244', 'Papad Fry', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3245', 'Masala Papad', NULL, 20, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3246', 'Onion Salad', NULL, 30, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3247', 'Green Salad', NULL, 50, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3248', 'Kachumer Salad', NULL, 60, true, true, 'Papad & Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sahu Egg Roll (legacy shop #115)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sahu-egg-roll-115',
    'Sahu Egg Roll',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    1.5,
    2,
    40,
    50,
    1,
    171,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3259', 'Single Egg Roll', NULL, 35, false, true, 'Full Menu', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3260', 'Double Egg Roll', NULL, 50, false, true, 'Full Menu', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3261', 'Chicken Single Egg Roll', NULL, 80, false, true, 'Full Menu', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3262', 'Chicken Double Egg Roll', NULL, 90, false, true, 'Full Menu', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3263', 'Chicken Chilli', NULL, 80, false, true, 'Full Menu', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3270', 'Egg Bhurji', NULL, 35, false, true, 'Full Menu', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3271', 'Egg Chilli', 'Contains 2 Eggs', 110, false, true, 'Full Menu', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Bhukkad (legacy shop #116)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'bhukkad-116',
    'Bhukkad',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4.3,
    19,
    25,
    35,
    2,
    245,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3272', 'Margherita Pizza', NULL, 110, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3273', 'Classic Onion Pizza', NULL, 140, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3274', 'Cheese Corn Pizza', NULL, 140, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3275', 'Veg Cheese Pizza', NULL, 165, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3276', 'Bhukkad Special Pizza', NULL, 165, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3277', 'Maxican Pizza', NULL, 195, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3278', 'Paneer Pizza', NULL, 195, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3279', 'Mushroom Pizza', NULL, 205, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3280', 'Tandoori Paneer Pizza', NULL, 215, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3281', 'Paneer Makhani Pizza', NULL, 215, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3282', 'Cheese Brust Paneer Pizza', NULL, 275, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3283', 'Cheese Brust Maxican Pizza', NULL, 275, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3284', 'Tikki Burger', NULL, 45, true, true, 'Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3285', 'Desi Burger', NULL, 55, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3286', 'Paneer Burger', NULL, 65, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3287', 'Cheese Burger', NULL, 65, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3288', 'Peri Peri Burger', NULL, 65, true, true, 'Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3289', 'Cheese Corn Burger', NULL, 80, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3290', 'Cheese Paneer Burger', NULL, 85, true, true, 'Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3291', 'Oreo Shake', NULL, 99, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3292', 'Chocolate Shake', NULL, 99, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3293', 'Kitkat  Shake', NULL, 99, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3294', 'Bubblegum shake', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3295', 'Chatni Sandwich', NULL, 45, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3296', 'Veg Mayo Sandwich', NULL, 45, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3297', 'Cheese Chatani Sandwich', NULL, 55, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3298', 'Onion Cheese Sandwich', NULL, 55, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3299', 'Veg Corn Sandwich', NULL, 65, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3300', 'Cheese Corn Sandwich', NULL, 65, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3301', 'Chocolate Sandwich', NULL, 65, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3302', 'Chilli Garlic Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3303', 'Paneer Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3304', 'Maxican Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3305', 'Tandoori Paneer Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3306', 'Bhukkad Special Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3307', 'Veg Corn Triple Layer Sandwich', NULL, 120, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3308', 'Plain Masala Maggi', NULL, 45, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3309', 'Veg Masala Maggie', NULL, 55, true, true, 'Maggi', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3310', 'Plain Cheese Maggie', NULL, 55, true, true, 'Maggi', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3311', 'Schezwan Maggi', NULL, 80, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3312', 'Veg Corn Maggie', NULL, 65, true, true, 'Maggi', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3313', 'Veg Cheese Maggi', NULL, 65, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3314', 'Veg Peri Peri Maggie', NULL, 80, true, true, 'Maggi', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3315', 'Cheese Corn Maggie', NULL, 80, true, true, 'Maggi', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3316', 'Chilli Garlic Maggie', NULL, 90, true, true, 'Maggi', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3317', 'Paneer Fry Maggie', NULL, 90, true, true, 'Maggi', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3318', 'Maxican Maggie', NULL, 99, true, true, 'Maggi', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3319', 'Tandoori Maggie', NULL, 90, true, true, 'Maggi', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3320', 'Masala Pasta', NULL, 55, true, true, 'Pasta', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3321', 'Red Sauce Pasta', NULL, 80, true, true, 'Pasta', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3322', 'White Sauce Pasta', NULL, 90, true, true, 'Pasta', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3323', 'Maxican Pasta', NULL, 99, true, true, 'Pasta', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3324', 'Tandoori Pasta', NULL, 99, true, true, 'Pasta', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3325', 'Fried Rice', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3326', 'Schezwan Rice', NULL, 90, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3327', 'Manchurian Rice', NULL, 99, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3328', 'Shanghai Rice', NULL, 110, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3329', 'Paneer Chilli', NULL, 90, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3330', 'Manchurian', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3331', 'Saucy Wrap', NULL, 90, true, true, 'Wraps', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3332', 'Spicy Veg Wrap', NULL, 99, true, true, 'Wraps', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3333', 'Paneer Makhani Wrap', NULL, 110, true, true, 'Wraps', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3334', 'Paneer Salsa Wrap', NULL, 110, true, true, 'Wraps', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3337', 'Salted French Fries', NULL, 55, true, true, 'Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3338', 'Peri Peri Fries', NULL, 65, true, true, 'Fries', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3339', 'Cheese French Fries', NULL, 99, true, true, 'Fries', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3433', 'Cold coffee', NULL, 80, true, true, 'Shakes', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4473', 'Paneer chilli roll', NULL, 100, true, true, 'Rolls', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4665', 'Soya chilli', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4674', 'Veg chowmein', NULL, 90, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4675', 'Hakka noodles', NULL, 110, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4676', 'Schezwan noodles', NULL, 110, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4678', 'Chinese bhel', NULL, 80, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4679', 'Paneer makhani roll', NULL, 110, true, true, 'Rolls', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4680', 'Soya chilli roll', NULL, 90, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4681', 'Cold coffee with hazelnut', NULL, 90, true, true, 'Shakes', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4682', 'Lemon iced tea', NULL, 99, true, true, 'Iced tea', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4683', 'Green apple iced tea', NULL, 99, true, true, 'Iced tea', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4684', 'Watermelon iced tea', NULL, 99, true, true, 'Iced tea', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4685', 'Pea iced tea', NULL, 99, true, true, 'Iced tea', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4686', 'Vergin mojito', NULL, 70, true, true, 'Mocktail', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4687', 'Green mint', NULL, 70, true, true, 'Mocktail', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4688', 'Blue lagoon', NULL, 70, true, true, 'Mocktail', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Hotel Kings Mahal (legacy shop #117)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'hotel-kings-mahal-117',
    'Hotel Kings Mahal',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3,
    2,
    25,
    35,
    3,
    560,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3344', 'Diet Coke', NULL, 49, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3345', 'Fresh Lemon Soda', NULL, 69, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3346', 'Kiwi Cooler', NULL, 165, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3347', 'Virgin Mojito', NULL, 165, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3348', 'Electric Lemonade', NULL, 165, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3349', 'Blue Lagoon', NULL, 165, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3350', 'Sweet Corn Soup', NULL, 165, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3351', 'Hot & Sour Soup', NULL, 140, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3352', 'Lemon Coriander Soup', NULL, 140, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3353', 'Manchow Soup', NULL, 140, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3354', 'Tomato Dhaniya Shorba', NULL, 140, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3355', 'Golden Corn Salad', NULL, 175, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3356', 'Peanut Masala', NULL, 115, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3357', 'Hindustani Hara Salad', NULL, 100, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3359', 'Bombay Bhel Puri Salad', NULL, 180, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3360', 'Roasted Papad', NULL, 29, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3361', 'Masala Roasted Papad', NULL, 49, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3362', 'Poha', NULL, 119, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3363', 'Chole Bhature', NULL, 219, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3364', 'Paneer Paratha', NULL, 119, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3365', 'Puri Bhaji', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3366', 'Bread Butter Toast', NULL, 109, true, true, 'Breakfast', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3367', 'Veg Sandwich', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3368', 'Veg Grilled Sandwich', NULL, 160, true, true, 'Breakfast', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3369', 'Cheese Sandwich', NULL, 180, true, true, 'Breakfast', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3370', 'Cheese Grilled Sandwich', NULL, 199, true, true, 'Breakfast', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3371', 'Idli Sambhar', NULL, 89, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3372', 'Uttapam', NULL, 115, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3373', 'Upma', NULL, 89, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3374', 'Plain Dosa', NULL, 115, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3375', 'Masala Dosa', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3376', 'Cutting Masala Dosa', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3378', 'Paneer Masala Dosa', NULL, 170, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3379', 'King''s Special Dosa', NULL, 199, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3380', 'Chinese Bhel', NULL, 250, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3381', 'Chowmein', NULL, 265, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3382', 'Vegetable Spring Roll', NULL, 275, true, true, 'Chinese', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3383', 'Mushroom Ginger Chilli', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3384', 'Crispy Corn', NULL, 250, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3385', 'Paneer Chilli', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3386', 'Paneer 65', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3387', 'Chinese Cigar', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3388', 'Shanghai Style Street Noodles', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3389', 'Hakka Noodels', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3390', 'Schezwan Noddels', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3391', 'Schezwan Fried Rice', NULL, 220, true, true, 'Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3392', 'Paneer Butter Masala', NULL, 330, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3393', 'Paneer Kadhai', NULL, 330, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3394', 'Kumbh Hara Dhaniya Pyaazwala', NULL, 330, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3395', 'Subz Kofta', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3396', 'Bhindi Masala', NULL, 289, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3397', 'Bhindi Kurkuri', NULL, 289, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3398', 'Mix Veg', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3399', 'Veg Keema Kastoori', NULL, 299, false, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3400', 'Mushroom Masala', NULL, 330, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3401', 'Methi Matar Malai', NULL, 345, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3402', 'Chana Masala', NULL, 289, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3403', 'King''s Chef Special', NULL, 379, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3404', 'Dal Dhaba', NULL, 269, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3405', 'Dal Punchratan', NULL, 269, true, true, 'Daal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3406', 'Steamed Rice', NULL, 170, true, true, 'Rice', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3407', 'Jeera Rice', NULL, 199, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3408', 'Green Pees Pulao', NULL, 240, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3409', 'Mix Veg Pulao', NULL, 260, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3410', 'Kashmiri Pulao', NULL, 240, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3411', 'Subz Biryani', NULL, 330, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3412', 'Subz Dum Biryani', NULL, 349, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3413', 'Paneer Biryani', NULL, 369, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3414', 'Paneer Dum Biryani', NULL, 400, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3415', 'Soya Masaledar Biryani', NULL, 369, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3416', 'Soya Masaledar Dum Biryani', NULL, 400, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3417', 'Phulka', NULL, 25, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3418', 'Ghee Phulka', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3419', 'Tandoori Roti', NULL, 35, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3420', 'Butter Tandoori Roti', NULL, 40, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3421', 'Plain Naan', NULL, 79, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3422', 'Butter Naan', NULL, 90, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3423', 'Cheese Naan', NULL, 119, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3424', 'Garlic Naan', NULL, 119, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3425', 'Amritsari Kulcha', NULL, 149, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3426', 'Laccha Paratha', NULL, 119, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3427', 'Mota Roti', 'with ghee and chutney', 180, true, true, 'Chhattisgarhi Special', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3428', 'Chawal Ka Cheela', NULL, 110, true, true, 'Chhattisgarhi Special', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3429', 'Farra', NULL, 140, true, true, 'Chhattisgarhi Special', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3430', 'Sabundana Khichdi', NULL, 195, true, true, 'Chhattisgarhi Special', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3431', 'Classic Margherita Pizza', NULL, 269, true, true, 'Continental', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3432', 'Loaded Vegetable Pizza', NULL, 279, true, true, 'Continental', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4009', 'Tea', NULL, 35, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4010', 'Green Tea', NULL, 40, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4011', 'Coffee', NULL, 45, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4012', 'Cold Coffee with Ice Cream', NULL, 150, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4013', 'Ice Tea', NULL, 115, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4014', 'Peanut Butter Banana Shake', NULL, 230, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4015', 'Indiana', NULL, 150, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4016', 'Plain Lassi', NULL, 95, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4017', 'Dry Fruit Lassi', NULL, 115, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4018', 'Mahal''s Special', 'Its a Random Drink Make by the Chef can be PinaColata or Fruit Punch', 210, true, true, 'MOCKTAILS', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4019', 'Green Salad', NULL, 160, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4020', 'Caesar Salad', NULL, 180, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4021', 'Macroni Mustard Salad', NULL, 170, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4022', 'Veg Raita', NULL, 129, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4023', 'Boondi Raita', NULL, 129, true, true, 'Salad and Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4025', 'Aloo Paratha', NULL, 109, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4026', 'Chilli Paneer Dosa', NULL, 250, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4027', 'Cheese Masala Dosa', NULL, 170, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4028', 'Schezwan Masala Dosa', NULL, 250, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4029', 'Stir Fried Noodles', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4030', 'Stir Fried Vegetables', NULL, 265, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4031', 'Paneer Salt & Pepper', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4032', 'Mushroom Salt & Pepper', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4033', 'Vegetables Salt & Pepper', NULL, 265, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4034', 'Babycorn Salt & Pepper', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4035', 'Burnt Garlic Noodles', NULL, 289, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4036', 'Stir Fried Assorted Mushroom', NULL, 320, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4037', 'Traditional Veg Dim Sum', NULL, 229, true, true, 'Chinese', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4038', 'Spinach & Corn Dumplings', NULL, 229, true, true, 'Chinese', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4039', 'Mushroom & Coriander Dumplings', NULL, 229, true, true, 'Chinese', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4040', 'Veg Fried Wontons', NULL, 209, true, true, 'Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4041', 'Paneer Fried Wontons', NULL, 209, true, true, 'Chinese', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4042', 'Oriental Platter', NULL, 699, true, true, 'Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4044', 'Chatkari Vegetable', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4045', 'Jaan E Tarkari', NULL, 299, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4046', 'Paneer Pulao', NULL, 289, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4047', 'Jeera Corn Pulao', NULL, 269, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4048', 'Onion Pulao', NULL, 269, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4049', 'Peas Pulao', NULL, 269, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4050', 'Dal Tadka', NULL, 229, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4051', 'Dal Makhni Khichdi', NULL, 309, true, true, 'Daal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4052', 'Dal Makhni', NULL, 349, true, true, 'Daal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4053', 'Faimly Bread Basket', NULL, 320, true, true, 'Roti & Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4054', 'Overload Nacho', NULL, 320, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4055', 'Corn & Cheese Cigar Roll', NULL, 320, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4056', 'Tandoori Paneer Tikka Pizza', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4057', 'Fusion Pizza', NULL, 269, true, true, 'Continental', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4058', 'Penne Pasta', NULL, 339, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4059', 'Spaghetti Pasta', NULL, 339, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4060', 'Aglio Olio Pasta', NULL, 339, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4061', 'Cottage Cheese Steak', NULL, 349, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4062', 'Cottage Cheese Pineapple Roll', NULL, 339, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4063', 'Garlic Bread', NULL, 149, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4064', 'Cheese Garlic Bread', NULL, 170, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4065', 'Mumbaiya Masala Sandwich', NULL, 170, true, true, 'Continental', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4066', 'Cheese Chilly Toast', NULL, 170, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4067', 'Pesto Paneer Kathi Roll', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4068', 'French Fries', NULL, 139, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4069', 'Peri Peri French Fries', NULL, 149, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4070', 'Mutter Nariyal Ki Tikki', NULL, 289, true, true, 'Tandoor', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4071', 'Makai Badam Ki Tikki', NULL, 320, true, true, 'Tandoor', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4072', 'Hara Bhara Kabab', NULL, 289, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4073', 'Dahi Ke Kabab', NULL, 320, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4074', 'Magaz Paneer Tikka', NULL, 330, true, true, 'Tandoor', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4075', 'Achari Paneer Tikka', NULL, 320, true, true, 'Tandoor', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4076', 'Malai Paneer Tikka', NULL, 330, true, true, 'Tandoor', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4077', 'Kumbh Exotica', NULL, 320, true, true, 'Tandoor', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4078', 'Dahi ke Sholay', NULL, 310, true, true, 'Tandoor', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4079', 'Soya Tikka', NULL, 320, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4080', 'Tandoori Platter', NULL, 689, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4081', 'Shahi Dahi Vada', NULL, 170, true, true, 'Dessert', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4082', 'Gulab Jamun', NULL, 139, true, true, 'Dessert', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4083', 'Moong Dal Halwa', NULL, 209, true, true, 'Dessert', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4084', 'Pineapple Halwa', NULL, 209, true, true, 'Dessert', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4085', 'Sizzling Brownie', NULL, 209, true, true, 'Dessert', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4086', 'Tutti Fruity', NULL, 219, true, true, 'Dessert', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4087', 'Sundae', NULL, 219, true, true, 'Dessert', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4088', 'Banana Split Sundae', NULL, 229, true, true, 'Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4089', 'Death By Chocolate', NULL, 269, true, true, 'Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4090', 'Rajbhog', NULL, 169, true, true, 'Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4091', 'Rasgulla', NULL, 149, true, true, 'Dessert', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sheetla Chat Bhandar (legacy shop #118)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sheetla-chat-bhandar-118',
    'Sheetla Chat Bhandar',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    81,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3340', 'Pani Gupchup', NULL, 20, true, true, 'Chowpatty', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3341', 'Dahi Gupchup', NULL, 30, true, true, 'Chowpatty', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3342', 'Papdi Chat', NULL, 30, true, true, 'Chowpatty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3343', 'Chaat', NULL, 50, true, true, 'Chowpatty', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Poha Junction (legacy shop #119)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'poha-junction-119',
    'Poha Junction',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    103,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3592', 'Poha Jalebi', NULL, 35, true, true, 'Poha', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3593', 'Poha Chana', NULL, 30, true, true, 'Poha', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3594', 'Poha Samosa Chaat', NULL, 50, true, true, 'Poha', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3595', 'Pune Dahi Chilli Poha', 'Image May me Different as Original Food', 50, true, true, 'Poha', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3596', 'Indori Poha', 'Very hygienic and delicious 😋', 40, true, true, 'Poha', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- City Hut Pizza House (legacy shop #120)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'city-hut-pizza-house-120',
    'City Hut Pizza House',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Italian'],
    4.2,
    5,
    25,
    35,
    3,
    687,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3460', 'Volcano Pizza Regular', NULL, 200, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3461', 'Volcano Pizza Medium', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3462', 'Volcano Pizza Large', NULL, 400, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3463', 'Veggie House Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3464', 'Cheese Burst Veggie House Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3465', 'Farmhouse Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3466', 'Cheese Brust Farmhouse Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3467', 'Peri Peri Fries Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3468', 'Cheese Brust Peri Peri Fries Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3469', 'Paneer Tikka Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3470', 'Cheese Brust Paneer Tikka Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3471', 'Peri Peri Paneer Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3472', 'Cheese Brust Peri Peri Paneer Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3473', 'Butter Paneer Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3474', 'Cheese Brust Butter Paneer Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3475', 'Peri Peri Mushroom Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3476', 'Cheese Brust Peri Peri Mushroom Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3477', 'Butter Mushroom Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3478', 'Cheese Brust Butter Mushroom Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3479', 'Chinese Babycorn Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3480', 'Cheese Brust Chinese Babycorn Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3481', 'Corn Deluxe Pizza', NULL, 170, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3482', 'Cheese Brust Corn Deluxe Pizza', NULL, 300, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3483', 'Cheese N Corn Pizza', NULL, 150, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3484', 'Cheese Brust Cheese N Corn Pizza', NULL, 290, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3485', 'Fresh Paneer Pizza', NULL, 150, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3486', 'Cheese Brust Fresh Paneer Pizza', NULL, 290, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3487', 'Fresh Mushroom Pizza', NULL, 150, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3488', 'Cheese Brust Fresh Mushroom Pizza', NULL, 290, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3489', 'Veggie House Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3490', 'Cheese Brust Veggie House Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3491', 'Farmhouse Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3492', 'Cheese Brust Farmhouse Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3493', 'Peri Peri Fries Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3494', 'Cheese Brust Peri Peri Fries Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3495', 'Paneer Tikka Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3496', 'Cheese Brust Paneer Tikka Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3497', 'Peri Peri Paneer Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3498', 'Cheese Brust Peri Peri Paneer Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3499', 'Butter Paneer Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3500', 'Cheese Brust Butter Paneer Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3501', 'Peri Peri Mushroom Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3502', 'Cheese Brust Peri Peri Mushroom Pizza', NULL, 360, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3503', 'Butter Mushroom Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3504', 'Cheese Brust Butter Mushroom Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3505', 'Chinese Babycorn Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3506', 'Cheese Brust Chinese Babycorn Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3507', 'Corn Deluxe Pizza', NULL, 260, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3508', 'Cheese Brust Corn Deluxe Pizza', NULL, 460, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3509', 'Cheese N Corn Pizza', NULL, 240, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3510', 'Cheese Brust Cheese N Corn Pizza', NULL, 430, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3511', 'Tikki Burger', NULL, 80, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3512', 'Veg Burger', NULL, 100, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3513', 'Paneer Burger', NULL, 120, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3514', 'Maharaja Burger', NULL, 150, true, true, 'Burgers', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3515', 'Italian Veg Burger', NULL, 150, true, true, 'Burgers', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3516', 'Plain Cheese Sandwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3517', 'Cheese Corn Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3518', 'Fresh Paneer Pizza', NULL, 240, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3519', 'Cheese Brust Fresh Paneer Pizza', NULL, 430, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3520', 'Fresh Mushroom Pizza', NULL, 240, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3521', 'Cheese Brust Fresh Mushroom Pizza', NULL, 430, true, true, 'Pizza Medium', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3522', 'Margherita Pizza', NULL, 100, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3523', 'Onion Capsicum Pizza', NULL, 100, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3524', 'Tomato Pizza', NULL, 100, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3525', 'Achari Do Pyaza Pizza', NULL, 100, true, true, 'Pizza Regular', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3526', 'Veggie House Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3527', 'Cheese Brust Veggie House Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3528', 'Farmhouse Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3529', 'Cheese Brust Farmhouse Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3530', 'Peri Peri Fries Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3531', 'Cheese Brust Peri Peri Fries Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3532', 'Paneer Tikka Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3533', 'Cheese Brust Paneer Tikka Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3534', 'Peri Peri Paneer Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3535', 'Cheese Brust Peri Peri Paneer Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3536', 'Butter Paneer Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3537', 'Cheese Brust Butter Paneer Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3538', 'Peri Peri Mushroom Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3539', 'Cheese Brust Peri Peri Mushroom Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3540', 'Butter Mushroom Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3541', 'Cheese Brust Butter Mushroom Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3542', 'Chinese Baby Corn Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3543', 'Cheese Brust Chinese Babycorn Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3544', 'Corn Deluxe Pizza', NULL, 330, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3545', 'Cheese Brust Corn Deluxe Pizza', NULL, 600, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3546', 'Cheese N Corn Pizza', NULL, 310, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3547', 'Cheese Brust Cheese N Corn Pizza', NULL, 580, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3548', 'Fresh Paneer Pizza', NULL, 310, true, true, 'Pizza Large', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3549', 'Cheese Brust Paneer Pizza', NULL, 580, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3550', 'Fresh Mushroom Pizza', NULL, 310, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3551', 'Cheese Brust Mushroom Pizza', NULL, 580, true, true, 'Pizza Large', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3552', 'Cheese Corn Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3553', 'Bombay Masala Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3554', 'Veg Cheese Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3555', 'Paneer Cheese Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3556', 'Full Choco Grilled Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3557', 'Club Grilled Sandwih', NULL, 180, true, true, 'Sandwich', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3558', 'Normal Fries', NULL, 90, true, true, 'French Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3559', 'Masala Fries', NULL, 100, true, true, 'French Fries', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3560', 'Peri Peri Fries', NULL, 100, true, true, 'French Fries', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3561', '4 Cheese Fries', NULL, 200, true, true, 'French Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3562', 'Cold Coffe', NULL, 100, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3563', 'Cold Coffe With Ice Cream', NULL, 120, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3564', 'Chocolate Milk Shake', NULL, 120, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3565', 'Oreo Milk Shake', NULL, 120, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3566', 'Butterscotch Milk Shake', NULL, 120, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3567', 'Strawberry Milk Shake', NULL, 90, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3569', 'Blue Lagoon Mocktail', NULL, 100, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3570', 'Virgin Mojito', NULL, 100, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3571', 'Masala Coke', NULL, 50, true, true, 'Shakes and Drinks', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3585', 'Stuffed Cheese Garlic Bread', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3586', 'Masala Golden Corn', NULL, 50, true, true, 'Sweet Corn', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3587', 'Peri Peri Corn', NULL, 50, true, true, 'Sweet Corn', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3588', 'Normal Sweet Corn', NULL, 40, true, true, 'Sweet Corn', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Raw Meat (legacy shop #121)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'raw-meat-121',
    'Raw Meat',
    'Raw Meat',
    false,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    2,
    358,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3589', 'Chicken', NULL, 220, false, true, 'Raw', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3590', 'Fish', NULL, 200, false, true, 'Raw', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3591', 'Egg', NULL, 10, false, true, 'Raw', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- CRAZY CHAP HOUSE (legacy shop #122)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'crazy-chap-house-122',
    'CRAZY CHAP HOUSE',
    '0',
    false,
    false,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    40,
    50,
    2,
    217,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3597', 'Masala Chap', NULL, 90, true, true, 'CHAP', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3598', 'Malai Chap', NULL, 100, true, true, 'CHAP', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3599', 'Aachari Chap', NULL, 100, true, true, 'CHAP', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3600', 'Banjara Chap', NULL, 100, true, true, 'CHAP', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3601', 'Paneer Tikka', NULL, 130, true, true, 'CHAP', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3602', 'Mushroom Double Tikka', NULL, 130, true, true, 'CHAP', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3603', 'Paneer Tikka Roll', NULL, 90, true, true, 'ROLLS', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3604', 'Veg Potato Roll', NULL, 60, true, true, 'ROLLS', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3605', 'Chilly Paneer Roll', NULL, 90, true, true, 'ROLLS', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3606', 'Malai Chap Roll', NULL, 100, true, true, 'ROLLS', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3607', 'Masala Chap Roll', NULL, 80, true, true, 'ROLLS', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3608', 'Chole Kulche', NULL, 90, true, true, 'KULCHA/NAAN', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3609', 'Paneer Kulche', NULL, 100, true, true, 'KULCHA/NAAN', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3610', 'Chur Chur Naan', NULL, 100, true, true, 'KULCHA/NAAN', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3611', 'Paneer Chilly', NULL, 130, true, true, 'CHINESE', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3612', 'Manchurian', NULL, 100, true, true, 'CHINESE', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3613', 'Hakka Noodles', NULL, 90, true, true, 'CHINESE', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3614', 'Crispy Corn', NULL, 80, true, true, 'CHINESE', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3615', 'Chana Roast', NULL, 80, true, true, 'CHINESE', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3616', 'Mushroom Chilly', NULL, 100, true, true, 'CHINESE', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3617', 'Honey Chilli Potato', NULL, 70, true, true, 'CHINESE', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3618', 'Fried Rice', NULL, 90, true, true, 'CHINESE', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3619', 'Veg Grill Sandwich', NULL, 70, true, true, 'SANDWICH', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3620', 'Cheese Corn Sandwich', NULL, 80, true, true, 'SANDWICH', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3621', 'Bombay Masala Sandwich', NULL, 70, true, true, 'SANDWICH', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3622', 'Fruit Jam Sandwich', NULL, 60, true, true, 'SANDWICH', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3623', 'Plain Maggie', NULL, 50, true, true, 'MAGGIE', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3624', 'Veg Masala Maggie', NULL, 60, true, true, 'MAGGIE', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3625', 'Cheese Corn Maggie', NULL, 70, true, true, 'MAGGIE', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3626', 'Schezwan Maggie', NULL, 70, true, true, 'MAGGIE', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3627', 'Peri Peri Maggie', NULL, 80, true, true, 'MAGGIE', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3628', 'Salted Fries', NULL, 80, true, true, 'FRENCH FRIES', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3629', 'Peri Peri Fries', NULL, 80, true, true, 'FRENCH FRIES', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3630', 'Cheese Fries', NULL, 90, true, true, 'FRENCH FRIES', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3631', 'Steam Momos', NULL, 70, true, true, 'MOMOS', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3632', 'Tandoori Momos', NULL, 90, true, true, 'MOMOS', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3633', 'Fry Momos', NULL, 70, true, true, 'MOMOS', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3634', 'Kurkure Momos', NULL, 90, true, true, 'MOMOS', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3635', 'Veg Soya Chap Biryani', NULL, 100, true, true, 'BIRYANI', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- K.K RESTAURANT (legacy shop #123)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'k-k-restaurant-123',
    'K.K RESTAURANT',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    2,
    445,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3661', 'Minral Water', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3662', 'Black Tea', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3663', 'Regular Tea', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3664', 'Masala Tea', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3665', 'Black Coffee', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3666', 'Hot Coffee', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3667', 'Butter Milk', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3668', 'Lassi', NULL, 60, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3669', 'Fresh Lime Soda', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3670', 'Cold Coffee', NULL, 90, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3671', 'Cold Coffee with Icecream', NULL, 110, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3672', 'Masala Cold Drink', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3673', 'Mint Mojito', NULL, 90, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3674', 'Blue Heaven Mojito', NULL, 90, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3675', 'Cool Blue Mojito', NULL, 90, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3676', 'Strawberry Shake', NULL, 99, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3677', 'Vanila Milk Shake', NULL, 99, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3678', 'Butter Scotch Shake', NULL, 120, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3679', 'Pineapple Shake', NULL, 99, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3680', 'Oreo Shake', NULL, 110, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3681', 'Kitkat Shake', NULL, 110, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3682', 'French Fry', NULL, 90, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3683', 'Vegetable Cutlet', NULL, 90, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3684', 'Cheese Cutlet', NULL, 130, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3685', 'White Sauce Pasta', NULL, 200, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3686', 'Red Sauce Pasta', NULL, 210, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3687', 'Mix Sauce Pasta', NULL, 220, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3688', 'Vegetable Pakoda', NULL, 99, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3689', 'Mix Pakoda', NULL, 120, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3690', 'Paneer Pakoda', NULL, 140, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3691', 'Veg Burger', NULL, 90, true, true, 'Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3692', 'Veg Cheese Burger', NULL, 110, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3693', 'Corn Cheese Burger', NULL, 120, true, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3694', 'Paneer Cheese Burger', NULL, 140, true, true, 'Burger', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3695', 'Chicken Burger', NULL, 150, false, true, 'Burger', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3696', 'Cheese Pizza', NULL, 170, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3697', 'Tomato Onion Pizza', NULL, 180, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3698', 'Corn Capsicum Pizza', NULL, 190, true, true, 'Pizza', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3699', 'Mushroom Cheese Pizza', NULL, 199, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3700', 'Veg Cheese Pizza', NULL, 199, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3701', 'Punjabi Masala Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3702', 'Paneer Cheese Pizza', NULL, 210, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3703', 'Paneer Tikka Pizza', NULL, 230, true, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3704', 'Chicken Tikka Pizza', NULL, 240, false, true, 'Pizza', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3705', 'Double Cheese Pizza', NULL, 260, true, true, 'Pizza', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3706', 'Bread Butter Toast', NULL, 50, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3707', 'Veg Grilled Sandwich', NULL, 70, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3708', 'Grilled Cheese Sangwich', NULL, 80, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3709', 'Veg Cheese Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3710', 'Corn Cheese Sandwich', NULL, 99, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3711', 'Corn Spinese Sandwich', NULL, 99, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3712', 'Bombay Masala Sandwich', NULL, 99, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3713', 'Club Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3714', 'Double Decker Sandwich', NULL, 140, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3715', 'Chole Bhature', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3716', 'Plain Dosa', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3717', 'Masala Dosa', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3718', 'Paper Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3719', 'Mysore Masala Dosa', NULL, 100, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3720', 'Rawa Dosa Plain', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3721', 'Rawa Masala Dosa', NULL, 180, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3722', 'Jini Dpsa', NULL, 160, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3723', 'Idly Sambhar', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3724', 'Fried Idly', NULL, 70, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3725', 'Sambhar Wada', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3726', 'Plain Uttapam', NULL, 60, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3727', 'Masala Uttapam', NULL, 80, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3728', 'Onion Tomato Uttapam', NULL, 90, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3729', 'Paneer Cheese Uttapam', NULL, 120, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3730', 'Special Masala Dosa', NULL, 130, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3731', 'Green Salad', NULL, 60, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3732', 'Kachumber Salad', NULL, 70, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3733', 'Onion Salad', NULL, 40, true, true, 'Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3734', 'Cucumber Salad', NULL, 60, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3735', 'Fruit Salad', NULL, 90, true, true, 'Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3736', 'Papad Dry', NULL, 20, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3737', 'Papad Fry', NULL, 25, true, true, 'Papad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3738', 'Papad Masala Dry', NULL, 50, true, true, 'Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3739', 'Papad Masala Fry', NULL, 60, true, true, 'Papad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3740', 'Plain Curd', NULL, 50, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3741', 'Boondi Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3742', 'Veg Raita', NULL, 60, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3743', 'Pineapple Raita', NULL, 80, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3744', 'Fruit Raita', NULL, 99, true, true, 'Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3745', 'Veg Manchow Soup', NULL, 99, true, true, 'Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3746', 'Veg Hot N Sour Soup', NULL, 99, true, true, 'Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3747', 'Veg Clear Soup', NULL, 99, true, true, 'Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3748', 'Veg Lemon Coriander Soup', NULL, 99, true, true, 'Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3749', 'Veg Sweet Corn Soup', NULL, 110, true, true, 'Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3750', 'Cream of Veg Soup', NULL, 110, true, true, 'Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3751', 'Cream of Tomato Soup', NULL, 110, true, true, 'Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3752', 'Cream of Mushroom Soup', NULL, 120, true, true, 'Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3753', 'Chicken Manchow Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3754', 'Chicken Hot N Sour Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3755', 'Chicken Sweet Corn Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3756', 'Chicken Clear Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3757', 'Chicken Lemon Coriander Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3758', 'Cream of Chicken Soup', NULL, 130, false, true, 'Non Veg Soup', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3760', 'Sanghai Roll', NULL, 160, true, true, 'Rolls', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3761', 'Sigar Roll', NULL, 160, true, true, 'Rolls', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3762', 'Chicken Spring Roll', NULL, 199, false, true, 'Rolls', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3763', 'Chicken Sanghai Roll', NULL, 199, false, true, 'Rolls', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3773', 'Paneer Chilly', NULL, 220, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3774', 'Mushroom Chilly', NULL, 190, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3775', 'Chana Roast', NULL, 140, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3776', 'Chana Chilly', NULL, 160, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3777', 'Crishpy Corn', NULL, 180, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3778', 'Corn Chilly', NULL, 190, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3779', 'Baby Corn Chilli', NULL, 180, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3780', 'Crispy Veg', NULL, 199, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3781', 'Veg Manchurian', NULL, 149, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3782', 'Paneer Manchurian', NULL, 190, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3783', 'Paneer 65', NULL, 210, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3784', 'Paneer Hongkong', NULL, 210, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3785', 'Garlic Paneer', NULL, 199, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3786', 'Paneer Salt & Paper', NULL, 180, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3787', 'Garlic Mushroom', NULL, 199, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3788', 'Mushroom Salt & Paper', NULL, 199, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3789', 'Veg Chopsy', NULL, 220, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3790', 'American Chopsy', NULL, 240, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3791', 'Chinese Bhel', NULL, 160, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3792', 'Chilly Potato', NULL, 160, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3793', 'Honey Chilli Potato', NULL, 180, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3794', 'Veg Noodles', NULL, 140, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3795', 'Veg Hakka Noodles', NULL, 150, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3796', 'Veg Schezwan Noodles', NULL, 170, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3797', 'Paneer Noodle', NULL, 220, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3798', 'Paneer Hakka Noodle', NULL, 250, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3799', 'Paneer Schezwan Noodle', NULL, 250, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3800', 'Hot Chilli Grlic Noodle', NULL, 150, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3801', 'Mushroom Noodle', NULL, 199, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3802', 'Veg Chinese Platter', NULL, 299, true, true, 'Veg Chinese Starter', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3803', 'Hara Bhara Kabab', NULL, 180, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3804', 'Dahi Kabab', NULL, 199, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3805', 'Veg Seek Kabab', NULL, 199, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3806', 'Cheese Corn Kurkure', NULL, 140, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3807', 'Paneer Tikka', NULL, 220, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3808', 'Paneer Ajwaini Tikka', NULL, 230, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3809', 'Paneer Malai Tikka', NULL, 260, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3810', 'Paneer Lahsuni Tikka', NULL, 240, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3811', 'Paneer Acchari Tikka', NULL, 240, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3812', 'Paneer Seek Kabab', NULL, 210, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3813', 'Tandoori Mushroom', NULL, 199, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3814', 'Veg Tandoori Platter', NULL, 350, true, true, 'Veg Indian Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3815', 'Egg Chilli', NULL, 160, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3816', 'Chicken Chilli Bone', NULL, 260, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3817', 'Chicken Chilli Boneless', NULL, 290, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3818', 'Chicken 65', NULL, 290, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3819', 'Chicken Crispy', NULL, 310, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3820', 'Chicken Hongkong', NULL, 300, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3821', 'Chicken Lolypop (4 Pieces)', NULL, 250, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3822', 'Chicken Salt & Papper', NULL, 310, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3823', 'Chicken Garlic', NULL, 310, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3824', 'Crispy Honey Chicken', NULL, 330, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3825', 'Chicken Manchurian', NULL, 210, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3826', 'Chicken Noodles', NULL, 180, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3827', 'Chicken Schezwan Noodles', NULL, 199, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3828', 'Non Veg Chinese Platter', NULL, 399, true, true, 'Non Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3829', 'Chicken Pakoda', NULL, 170, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3830', 'Chicken TIkka', NULL, 280, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3831', 'Chicken Malai Tikka', NULL, 320, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3832', 'Chicken Lahsuni Tikka', NULL, 350, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3833', 'Chicken Pudina Tikka', NULL, 310, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3834', 'Chicken Achari Tikka', NULL, 310, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3835', 'Chicken Seek Kabab', NULL, 300, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3836', 'Chicken Roast', NULL, 250, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3837', 'Chicken Roast', NULL, 450, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3838', 'Tandoori Chicken', NULL, 250, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3839', 'Chicken Tandoori', NULL, 450, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3840', 'Reshmi Kabab', NULL, 299, true, true, 'Non Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3841', 'Afgani Chicken TIkka', NULL, 299, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3842', 'Non Veg Tandoori Platter', NULL, 499, true, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3843', 'Chana Masala', NULL, 160, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3844', 'Mix Veg', NULL, 160, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3845', 'Veg Kadai', NULL, 180, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3846', 'Gobhi Aloo', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3847', 'Gobhi Matar', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3848', 'Gobhi Masala', NULL, 150, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3849', 'Bhindi Do Pyaza', NULL, 130, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3850', 'Bhindi Kurkure', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3851', 'Karela Do Pyaza', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3852', 'Karela Masala', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3853', 'Veg Kima Masala', NULL, 180, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3854', 'Veg Handi', NULL, 170, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3855', 'Veg Hydrabadi', NULL, 170, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3856', 'Aloo Jeera', NULL, 120, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3858', 'Punjabi Chole', NULL, 170, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3859', 'Veg Kofta', NULL, 170, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3860', 'Malai Kofta', NULL, 230, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3861', 'Haryali Kofta', NULL, 180, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3862', 'Matar Methi Masala', NULL, 190, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3863', 'Methi Matar Malai', NULL, 230, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3864', 'Corn Palak', NULL, 170, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3865', 'Tamatar Chatni', NULL, 120, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3866', 'Sev Tamatar', NULL, 140, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3867', 'Kaju Curry', NULL, 250, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3868', 'Kaju Masala', NULL, 250, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3869', 'Paneer Masala', NULL, 190, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3870', 'Matar Paneer', NULL, 180, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3871', 'Paneer Butter Masala', NULL, 220, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3872', 'Paneer Kadai', NULL, 220, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3873', 'Paneer Chatpata', NULL, 220, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3874', 'Paneer Kolhapuri', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3875', 'Paneer Punjabi', NULL, 240, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3876', 'Paneer Lababdar', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3877', 'Paneer Khurchan', NULL, 240, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3878', 'Paneer Do Pyaza', NULL, 240, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3879', 'Paneer Bhurji Dry', NULL, 190, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3880', 'Paneer Bhurji Curry', NULL, 210, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3881', 'Paneer Angara', NULL, 250, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3882', 'Paneer Rimjhim', NULL, 250, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3883', 'Paneer Kaleji', NULL, 280, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3884', 'Paneer Makhana', NULL, 250, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3885', 'Paneer Korma', NULL, 250, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3886', 'Shahi Paneer', NULL, 260, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3887', 'Methi Paneer', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3888', 'Palak Paneer', NULL, 220, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3889', 'Mushroom Matar Masala', NULL, 190, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3890', 'Mushroom Masala', NULL, 220, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3891', 'Mushroom Do Pyaja', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3892', 'Mushroom Kadai', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3893', 'Mushroom Butter Masala', NULL, 230, true, true, 'Main Course Paneer/Mushroom', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3894', 'Chicken Curry', NULL, 440, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3895', 'Chicken Masala', NULL, 460, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3896', 'Chicken Butter Masala Bone', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3897', 'Chicken Butter Masala B/L', NULL, 520, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3898', 'Chicken Bhuna', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3899', 'Chicken Do Pyaza', NULL, 480, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3900', 'Chicken Lapeta', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3901', 'Chicken Punjabi', NULL, 480, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3902', 'Chicken Kadai', NULL, 480, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3903', 'Chicken Kolhapuri', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3904', 'Chicken Tikka Masala', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3905', 'Chicken Handi', NULL, 580, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3906', 'Chichen Rara Masala', NULL, 550, true, true, 'Chicken', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3907', 'Chicken Bharta', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3908', 'Chicken Dhada', NULL, 490, false, true, 'Chicken', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3909', 'Egg Curry', NULL, 90, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3910', 'Egg Masala', NULL, 100, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3911', 'Egg Bhurji Curry', NULL, 100, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3912', 'Egg Bhurji Dry', NULL, 70, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3913', 'Egg Omlet', NULL, 50, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3914', 'Egg Pouched', NULL, 40, false, true, 'Egg', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3915', 'Egg Fry', NULL, 50, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3916', 'Boiled Egg', NULL, 40, false, true, 'Egg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3917', 'Fish Curry', NULL, 260, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3918', 'Fish Masala', NULL, 280, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3919', 'Fish Fry', NULL, 180, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3920', 'Fish Bangali Curry', NULL, 300, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3921', 'Mutton Curry', NULL, 350, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3922', 'Mutton Masala', NULL, 360, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3923', 'Mutton Bhuna', NULL, 360, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3924', 'Mutton Kadai', NULL, 430, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3925', 'Mutton Rogan Josh', NULL, 440, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3926', 'Mutton Handi', NULL, 440, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3927', 'Mutton Lapeta', NULL, 430, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3928', 'Mutton Do Pyaza', NULL, 440, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3929', 'Mutton Rara Masala', NULL, 460, false, true, 'Fish/Mutton', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3930', 'Veg Fry Rice', NULL, 140, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3931', 'Paneer Fried Rice', NULL, 199, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3932', 'Mushroom Fried RIce', NULL, 220, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3933', 'Triple Fried RIce', NULL, 180, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3934', 'Egg Fried Rice', NULL, 160, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3935', 'Egg Schezwan RIce', NULL, 180, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3936', 'Chicken Fried Rice', NULL, 180, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3937', 'Chicken Schezwan RIce', NULL, 190, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3938', 'Steam RIce', NULL, 90, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3939', 'Jeera Rice', NULL, 110, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3940', 'Onion Tomato Jeera Rice', NULL, 130, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3941', 'Lemon RIce', NULL, 130, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3942', 'Veg Pulao', NULL, 150, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3943', 'Kashmiri Pulao', NULL, 180, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3944', 'Navratan Pulao', NULL, 199, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3945', 'Paneer Pulao', NULL, 180, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3946', 'Green Peas Pulao', NULL, 140, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3947', 'Dal Khichdi', NULL, 140, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3948', 'Masala Khichdi', NULL, 160, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3949', 'Curd Rice', NULL, 140, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3950', 'Veg Biryani', NULL, 180, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3951', 'Veg Hydrabadi Biryani', NULL, 199, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3952', 'Paneer Biryani', NULL, 210, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3953', 'Paneer Tikka Biryani', NULL, 230, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3954', 'Mushroom Biryani', NULL, 220, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3955', 'Egg Biryani', NULL, 180, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3956', 'Chicken Biryani', NULL, 150, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3957', 'Chicken Biryani', NULL, 280, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3958', 'Chicken Hydrabadi Biryani', NULL, 190, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3959', 'Chicken Hydrabadi Biryani', NULL, 320, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3960', 'Mutton Biryani', NULL, 190, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3961', 'Mutton Biryani', NULL, 350, false, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3962', 'Biryani RIce', NULL, 90, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3963', 'Biryani RIce', NULL, 160, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3964', 'Plain Dal', NULL, 80, true, true, 'Dal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3965', 'Dal Fry', NULL, 120, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3966', 'Dal Butter Fry', NULL, 130, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3967', 'Dal Tadka', NULL, 130, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3968', 'Dal Makhni', NULL, 140, true, true, 'Dal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3969', 'Dal Mukhlai', NULL, 150, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3970', 'Sev Tamatar', NULL, 160, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3971', 'Masala Rice', NULL, 180, true, true, 'RIce/Biryani', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3972', 'Chicken Kadi', NULL, 80, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3973', 'Tawa Roti', NULL, 15, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3974', 'Tawa Butter Roti', NULL, 20, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3975', 'Tandoori Roti', NULL, 15, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3976', 'Tandoori Butter Roti', NULL, 20, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3977', 'Plain Naan', NULL, 40, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3978', 'Butter Naan', NULL, 60, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3979', 'Garlic Naan', NULL, 70, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3980', 'Kashmiri Naan', NULL, 90, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3981', 'Cheese Garlic Naan', NULL, 110, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3982', 'Laccha Paratha', NULL, 40, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3983', 'Missi Roti', NULL, 30, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3984', 'Mix Masala Kulcha', NULL, 50, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3985', 'Paneer Kulcha', NULL, 70, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3986', 'Plain Paratha', NULL, 35, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3987', 'Aloo Paratha with Curd', NULL, 70, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3988', 'Gobhi Paratha with Curd', NULL, 70, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3989', 'Mix Paratha with Curd', NULL, 80, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3990', 'Paneer Paratha with Curd', NULL, 90, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3991', 'Hot Gulab Jamun', NULL, 50, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3992', 'Hot Gulab Jamun with Ice Cream', NULL, 90, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3993', 'Vanila Ice Cream', NULL, 60, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3994', 'Chocolate Ice Cream', NULL, 80, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3995', 'Butter Scotch Ice Cream', NULL, 70, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3996', 'Strawberry Ice Cream', NULL, 60, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3997', 'American Nuts Ice Cream', NULL, 80, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3998', 'Rabdi Kulfi', NULL, 30, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3999', 'Rajwadi Kulfi', NULL, 30, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4000', 'Choco Delight Cone', NULL, 35, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4001', 'Strawberry Delight Cone', NULL, 35, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4002', 'Chocochips Cone', NULL, 45, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4003', 'Butter Scotch Cone', NULL, 45, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4004', 'Dark Chocolate Cone', NULL, 55, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4005', 'Badam Roasted Cone', NULL, 55, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4006', 'Matka Kulfi', NULL, 65, true, true, 'Dessert/ Ice Cream', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4007', 'Veg Thali', NULL, 150, true, true, 'Thali', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4008', 'Non Veg Thali', NULL, 210, true, true, 'Thali', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- SONNA DA DHABA (legacy shop #124)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sonna-da-dhaba-124',
    'SONNA DA DHABA',
    'FOOD',
    false,
    true,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    2,
    341,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4092', 'Chicken Biryani', NULL, 120, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4093', 'Chicken Biryani', NULL, 240, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4094', 'Mutton Biryani', NULL, 180, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4095', 'Mutton Biryani', NULL, 360, false, true, 'Biryani', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4096', 'Chicken Chilli', NULL, 200, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4097', 'Chicken Roast', NULL, 100, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4098', 'Chicken Roast', NULL, 200, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4099', 'Chicken Kadi', NULL, 50, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4100', 'Chicken 65', NULL, 240, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4101', 'Fish Roast', NULL, 100, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4102', 'Fish Roast', NULL, 200, false, true, 'Non Veg Starters', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4103', 'Anda Chilli', NULL, 160, true, true, 'Non Veg Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4104', 'Anda Fry', NULL, 30, true, true, 'Non Veg Starters', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4105', 'Egg Curry', NULL, 70, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4106', 'Egg Masala', NULL, 80, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4107', 'Egg Bhurji', NULL, 50, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4108', 'Egg Bhurji Curry', NULL, 70, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/20858362/pexels-photo-20858362.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4109', 'Chicken Curry', NULL, 100, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4110', 'Chicken Curry', NULL, 200, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4111', 'Chicken Masala', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4112', 'Chicken Masala', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4113', 'Chicken Lapeta', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4114', 'Chicken Lapeta', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4115', 'Chicken Kadai', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4116', 'Chicken Kadai', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4117', 'Chicken Kolhapuri', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4118', 'Chicken Kolhapuri', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4119', 'Chicken Kima Masala', NULL, 150, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4120', 'Chicken Kima Masala', NULL, 280, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4121', 'Chicken Lahsuni', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4122', 'Chicken Lahsuni', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4123', 'Chicken Dehati', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4124', 'Chicken Dehati', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4125', 'Chicken Hydrabadi', NULL, 140, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4126', 'Chicken Hydrabadi', NULL, 250, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4127', 'Fish Curry', NULL, 100, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4128', 'Fish Curry', NULL, 200, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4129', 'Fish Lapeta', NULL, 120, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4130', 'Fish Lapeta', NULL, 220, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4131', 'Fish Dahi', NULL, 130, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4132', 'Fish Dahi', NULL, 240, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/7252875/pexels-photo-7252875.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4133', 'Mutton Curry', NULL, 160, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4134', 'Mutton Curry', NULL, 320, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4135', 'Mutton Masala', NULL, 350, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4136', 'Mutton Masala', NULL, 180, false, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4137', 'Bater Masala', NULL, 190, true, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4138', 'Bater Masala', NULL, 380, true, true, 'Non-Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4139', 'Papad Dry', NULL, 20, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4140', 'Papad Fry', NULL, 25, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4141', 'Masala Papad', NULL, 40, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4142', 'Hara Bhara Kabab', NULL, 180, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4143', 'Paneer Chilli', NULL, 180, true, true, 'Veg Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4144', 'Paneer Pakoda', NULL, 100, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4145', 'Paneer 65', NULL, 220, true, true, 'Veg Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4146', 'Chana Roast', NULL, 180, true, true, 'Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4147', 'Chana Chilli', NULL, 160, true, true, 'Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4148', 'Corn Chilli', NULL, 160, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4149', 'Mushroom Chilli', NULL, 220, true, true, 'Veg Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4150', 'Finger Chips', NULL, 100, true, true, 'Veg Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4151', 'Peanut Masala', NULL, 120, true, true, 'Veg Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4152', 'Veg Thali', 'Dal /Rice /2 Roti / 1 Sabji', 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4153', 'Veg Thali', 'Dal / Rice / 2 Roti / 2 Sabji', 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4154', 'Tamatar Chat', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4155', 'Gobhi Matar', NULL, 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4156', 'Gobhi Aloo', NULL, 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4157', 'Karela Pyaj', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4158', 'Bhindi Pyaj', NULL, 80, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4159', 'Bhindi Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4160', 'Chana Masala', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4161', 'Mix Veg', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4162', 'Mix Veg', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4163', 'Mushroom Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4164', 'Mushroom Masala', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4165', 'Paneer Matar', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4166', 'Paneer Matar', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4167', 'Paneer Masala', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4168', 'Paneer Masala', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4169', 'Paneer Kadai', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4170', 'Paneer Kadai', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4171', 'Paneer Kolhapuri', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4172', 'Paneer Kolhapuri', NULL, 220, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4173', 'Sev Tamatar', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4174', 'Sev Bhaji', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4175', 'Aloo Jeera', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4176', 'Dum Aloo', NULL, 100, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4177', 'Palak Aloo', NULL, 90, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4178', 'Palak Paneer', NULL, 180, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4179', 'Kaju Masala', NULL, 120, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4180', 'Kaju Masala', NULL, 240, true, true, 'Veg Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4181', 'Plain Dal', NULL, 70, true, true, 'Dal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4182', 'Maharani Dal', NULL, 160, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4183', 'Mughlai Dal', NULL, 150, true, true, 'Dal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4184', 'Dal Fry', NULL, 100, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4185', 'Dal Tadka', NULL, 120, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4186', 'Dal Makhni', NULL, 180, true, true, 'Dal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4187', 'Dal Jeera', NULL, 90, true, true, 'Dal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4188', 'Plain RIce', NULL, 60, true, true, 'Rice', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4189', 'Jeera RIce', NULL, 100, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4190', 'Masala Rice', NULL, 120, true, true, 'Rice', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4191', 'Egg Fried Rice', NULL, 80, false, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4192', 'Egg Fried Rice', NULL, 150, false, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4193', 'Chicken Fried Rice', NULL, 140, false, true, 'Rice', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4194', 'Chicken Fried RIce', NULL, 260, false, true, 'Rice', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4195', 'Dal Khichdi', NULL, 80, true, true, 'Rice', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4196', 'Dal Khichdi', NULL, 150, true, true, 'Rice', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4197', 'Aloo Paratha', NULL, 40, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4198', 'Paneer Paratha', NULL, 50, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4199', 'Gobhi Paratha', NULL, 40, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4200', 'Plain Paratha', NULL, 30, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4201', 'Tawa Roti', NULL, 10, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4202', 'Tawa Butter Roti', NULL, 15, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4203', 'Tandoori Roti', NULL, 10, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4204', 'Tandoori Butter Roti', NULL, 15, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4205', 'Butter Naan', NULL, 40, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4206', 'Garlic Naan', NULL, 40, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4207', 'Missi Roti', NULL, 30, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4208', 'Laccha Paratha', NULL, 30, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4209', 'Paneer Kulcha', NULL, 60, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4210', 'Chole Bhature', NULL, 80, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Sahu Biryani (legacy shop #125)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'sahu-biryani-125',
    'Sahu Biryani',
    'Foods',
    false,
    false,
    'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Biryani'],
    5,
    0,
    25,
    35,
    2,
    383,
    NULL,
    false
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-3764', 'Chicken Biryani', NULL, 110, false, true, 'Non-Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3765', 'Chicken Biryani', NULL, 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3766', 'Egg Biryani', NULL, 100, false, true, 'Non-Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3767', 'Egg Biryani', NULL, 200, false, true, 'Non-Veg', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3768', 'Chicken Curry', NULL, 120, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3769', 'Chicken Curry', NULL, 230, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3770', 'Egg Bhurji', NULL, 80, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3771', 'Fish Curry', NULL, 190, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-3772', 'Fish Fry', NULL, 150, false, true, 'Non-Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Chhitiz Swad Restaurant (legacy shop #126)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'chhitiz-swad-restaurant-126',
    'Chhitiz Swad Restaurant',
    'Foods',
    true,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    2,
    316,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4212', 'Tea', NULL, 15, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4213', 'Lemon Tea', NULL, 15, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4214', 'Black Tea', NULL, 15, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4216', 'Special Tea', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4217', 'Coffee', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4218', 'Cold Coffee', NULL, 89, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4219', 'Lassi', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4220', 'Oreo Shake', NULL, 89, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4221', 'Vanila Shake', NULL, 89, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4222', 'Chocolate Shake', NULL, 99, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4223', 'Badam Shake', NULL, 119, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4224', 'Kaju Shake', NULL, 119, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4225', 'Lemon Water', NULL, 30, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4226', 'Lime Masala Soda', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4227', 'Masala Cold Drink', NULL, 50, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4228', 'Green Mint Mojito', NULL, 69, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4229', 'Blue Ocean Mojito', NULL, 69, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4230', 'Aloo Bonda', NULL, 30, true, true, 'Breakfast', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4231', 'Poha', NULL, 30, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4232', 'Mirchi Bhajiya', NULL, 40, true, true, 'Breakfast', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4233', 'Bread Ball', NULL, 50, true, true, 'Breakfast', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4234', 'Moong Vada', NULL, 60, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4235', 'Upma', NULL, 60, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4236', 'Plain Paratha', NULL, 30, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4237', 'Methi Paratha', NULL, 50, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4238', 'Aloo Paratha', NULL, 60, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4239', 'Gobhi Paratha', NULL, 70, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4240', 'Paneer Paratha', NULL, 80, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4241', 'Masala Kulcha', NULL, 90, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4242', 'Puri Sabji', NULL, 70, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4243', 'Chole Bhature', NULL, 109, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4244', 'Tawa Roti', NULL, 12, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4245', 'Tawa Butter Roti', NULL, 15, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4246', 'Tandoori Roti', NULL, 15, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4247', 'Tandoori Butter Roti', NULL, 20, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4248', 'Butter Naan', NULL, 39, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4249', 'Garlic Naan', NULL, 49, true, true, 'Roti / Paratha', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4250', 'Peanut Chat Masala', NULL, 99, true, true, 'Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4251', 'Cutlets', NULL, 109, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4252', 'Finger Chips', NULL, 129, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4253', 'Chana Roast', NULL, 129, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4254', 'Bhindi Kurkure', NULL, 149, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4255', 'Hara Bhara Kabab', NULL, 149, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4256', 'Spring Roll', NULL, 149, true, true, 'Starters', 'https://images.pexels.com/photos/8846006/pexels-photo-8846006.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4257', 'Veg Manchurian', NULL, 159, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4258', 'Veg Lolipop', NULL, 169, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4259', 'Veg Pocket', NULL, 199, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4260', 'Cheese Ball', NULL, 199, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4261', 'Shahi Petro', NULL, 199, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4262', 'Potato Chilli', NULL, 139, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4263', 'Chana Chilli', NULL, 159, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4264', 'Crispy Corn', NULL, 179, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4265', 'Corn Chilli', NULL, 199, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4266', 'Paneer Chilli', NULL, 199, true, true, 'Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4267', 'Paneer 65', NULL, 209, true, true, 'Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4268', 'Mushroom Chilli', NULL, 229, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4269', 'Baby Corn Chilli', NULL, 229, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4270', 'Paneer Tikka', NULL, 219, true, true, 'Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4271', 'Paneer Achari Tikka', NULL, 239, true, true, 'Starters', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4272', 'Paneer Hariyali Tikka', NULL, 239, true, true, 'Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4273', 'Paneer Pahadi Tikka', NULL, 249, true, true, 'Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4274', 'Mushroom Tikka', NULL, 249, true, true, 'Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4275', 'Bread Pakoda', NULL, 49, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4276', 'Onion Pakoda', NULL, 69, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4277', 'Mix Pakoda', NULL, 109, true, true, 'Starters', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4278', 'Paneer Pakoda', NULL, 139, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4279', 'Veg Chowmein', NULL, 129, true, true, 'Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4280', 'Schezwan Noodles', NULL, 129, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4281', 'Hakka Noodles', NULL, 139, true, true, 'Starters', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4282', 'Paneer Noodles', NULL, 149, true, true, 'Starters', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4283', 'Veg Manchow', NULL, 79, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4284', 'Hot & Sour SOup', NULL, 89, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4285', 'Veg Sweet Corn Soup', NULL, 109, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4286', 'Tomato Soup', NULL, 109, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4287', 'Plain Maggi', NULL, 39, true, true, 'Starters', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4288', 'Masala Maggie', NULL, 69, true, true, 'Starters', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4289', 'Cheese Masala Maggie', NULL, 89, true, true, 'Starters', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4290', 'Red Sauce Pasta', NULL, 109, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4291', 'White Sauce Pasta', NULL, 129, true, true, 'Starters', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4292', 'Plain Dosa', NULL, 49, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4293', 'Masala Dosa', NULL, 79, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4294', 'Cutting Dosa', NULL, 89, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4296', 'Gun Powder Masala Dosa', NULL, 109, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4297', 'Paneer Dosa', NULL, 119, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4298', 'Cheese Dosa', NULL, 119, true, true, 'South Indian', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4299', 'Jini Dosa', NULL, 139, true, true, 'South Indian', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4300', 'Onion Pizza', NULL, 159, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4301', 'Capsicum Pizza', NULL, 169, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4302', 'Sweet Corn Pizza', NULL, 179, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4303', 'Paneer Pizza', NULL, 199, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4304', 'Mushroom Pizza', NULL, 199, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4305', 'Paneer Tikka Pizza', NULL, 219, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4306', 'Healthy White Sandwich', NULL, 69, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4307', 'Sweet Corn Sandwich', NULL, 89, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4308', 'Grilled Sandwich', NULL, 89, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4309', 'Cheese Grilled Sandwich', NULL, 119, true, true, 'Pizza / Sandwich', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4310', 'Plain Curd', NULL, 30, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4311', 'Buttermilk', NULL, 40, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4312', 'Boondi Raita', NULL, 69, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4313', 'Veg Raita', NULL, 79, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4314', 'Dry Papad', NULL, 20, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4315', 'Fry Papad', NULL, 30, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4316', 'Masala Papad', NULL, 40, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4317', 'Onion Salad', NULL, 40, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4318', 'Green Salad', NULL, 50, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4319', 'Classic Faimly Salad', NULL, 80, true, true, 'Raita/Papad/Salad', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4320', 'Palak Paneer', NULL, 199, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4321', 'Mutter Paneer', NULL, 199, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4322', 'Paneer Masala', NULL, 209, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4323', 'Paneer Kolhapuri', NULL, 209, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4324', 'Paneer Kadai', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4325', 'Paneer Lachedar', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4326', 'Paneer Punjabi', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4327', 'Paneer Do Pyaja', NULL, 219, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4328', 'Shahi Paneer', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4329', 'Paneer Butter Masala', NULL, 229, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4330', 'Paneer Bhurji', NULL, 239, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4331', 'Paneer Kofta', NULL, 239, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4332', 'Paneer Diwani', NULL, 249, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4333', 'Paneer Tikka Masala', NULL, 249, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4334', 'Paneer Pasanda', NULL, 259, true, true, 'Paneer', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4335', 'Paneer Maharaja', NULL, 269, true, true, 'Paneer', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4336', 'Kadhi', NULL, 99, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4337', 'Tamatar Chatni', NULL, 149, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4338', 'Jeera Aloo', NULL, 129, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4339', 'Sev Bhaji', NULL, 129, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4340', 'Aloo Gobhi', NULL, 149, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4341', 'Aloo Matar', NULL, 139, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4342', 'Aloo Chole', NULL, 149, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4343', 'Sev Tamatar', NULL, 149, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4344', 'Gobhi Masala', NULL, 159, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4345', 'Bhindi Masala', NULL, 159, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4346', 'Chana Masala', NULL, 169, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4347', 'Chole Masala', NULL, 169, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4348', 'Karela Roast', NULL, 169, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4349', 'Sweet Corn Palak', NULL, 169, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4350', 'Bhindi Do Pyaza', NULL, 189, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4351', 'Dum Aloo', NULL, 189, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4352', 'Mix Veg', NULL, 189, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4353', 'Veg Kofta', NULL, 189, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4354', 'Veg Kadai', NULL, 199, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4355', 'Veg Kolhapuri', NULL, 199, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4356', 'Veg Jaipuri', NULL, 199, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4357', 'Methi Matar Malai', NULL, 249, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4358', 'Mushroom Kadai', NULL, 259, true, true, 'Main Course Veg', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4359', 'Cheela', NULL, 60, true, true, 'CG Special', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4360', 'Chausela', NULL, 80, true, true, 'CG Special', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4361', 'Chawal Vada', NULL, 80, true, true, 'CG Special', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4362', 'Metha Bhajiya', NULL, 80, true, true, 'CG Special', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4363', 'Moong Vada', NULL, 80, true, true, 'CG Special', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4364', 'Chawal Roti', NULL, 109, true, true, 'CG Special', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Amritam Resturant (legacy shop #127)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'amritam-resturant-127',
    'Amritam Resturant',
    'Foods',
    false,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    3.7,
    3,
    25,
    35,
    3,
    544,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4366', 'Water', NULL, 20, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4367', 'Tea', NULL, 29, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4368', 'Green Tea', NULL, 39, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4369', 'Coffee', NULL, 39, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4370', 'Hot Milk', NULL, 59, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4371', 'Sweet Lassi', NULL, 59, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4372', 'Salty Lassi', NULL, 59, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4373', 'Lime Soda', NULL, 69, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4374', 'Masala Lime Soda', NULL, 69, true, true, 'Beverages', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4376', 'Cindrella', NULL, 139, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4377', 'Virgin Mojito', NULL, 149, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4378', 'Blue Lagoon', NULL, 149, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4379', 'Orange Blossom', NULL, 149, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4380', 'Fruit Punch', NULL, 159, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4381', 'Cold Coffee', NULL, 129, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4382', 'Cold Coffee with Ice Cream', NULL, 149, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4383', 'Chocolate Shake', NULL, 189, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4384', 'Strawberry Shake', NULL, 189, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4385', 'Vanilla Shake', NULL, 189, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4386', 'Oreo Shake', NULL, 199, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4387', 'Banana Shake', NULL, 199, true, true, 'Beverages', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4388', 'Kitkat Shake', NULL, 199, true, true, 'Beverages', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4389', 'Cream Of Tomato Soup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4390', 'Hot & Sour Soup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4391', 'Manchow SOup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4392', 'Sweet Corn Soup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4393', 'Veg Clear Soup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4394', 'Lemon Coriander Soup', NULL, 159, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4395', 'Tomato Dhaniya Shorba', NULL, 169, true, true, 'Soups', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4396', 'Veg Thupka Soup', NULL, 179, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4397', 'Mai Tai Soup', NULL, 179, true, true, 'Soups', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4398', 'Veg Maggie', NULL, 99, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4399', 'Veg Cheese Maggi', NULL, 99, true, true, 'Breakfast', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4400', 'Idli Sambhar', NULL, 79, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4401', 'Sambhar Wada', NULL, 89, true, true, 'Breakfast', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4402', 'Plain Dosa', NULL, 99, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4403', 'Masala Dosa', NULL, 129, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4404', 'Cutting Masala Dosa', NULL, 139, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4405', 'Schezwan Dosa', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4406', 'Mysore Masala Dosa', NULL, 139, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4408', 'Paneer Masala Dosa', NULL, 169, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4409', 'Cheese Masala Dosa', NULL, 169, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4410', 'Onion Uttapam', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4411', 'Tomato Uttapam', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4412', 'Mix Uttapam', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/6412834/pexels-photo-6412834.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4413', 'Onion Paratha', NULL, 109, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4414', 'Aloo Paratha', NULL, 109, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4415', 'Gobhi Paratha', NULL, 109, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4416', 'Paneer Paratha', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4417', 'Poori Bhaji', NULL, 139, true, true, 'Breakfast', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4418', 'Chole Bhature', NULL, 139, true, true, 'Breakfast', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4419', 'Veg Pakoda', NULL, 159, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4420', 'Onion Lachha Pakoda', NULL, 129, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4421', 'Paneer Pakoda', NULL, 199, true, true, 'Breakfast', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4422', 'Chana Roast', NULL, 149, true, true, 'Breakfast', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4423', 'Veg Cutlet', NULL, 189, true, true, 'Breakfast', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4424', 'Roasted Papad', NULL, 39, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4425', 'Fried Papad', NULL, 49, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4426', 'Masala Papad', NULL, 69, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4427', 'Onion Salad', NULL, 69, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4428', 'Green Salad', NULL, 89, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4429', 'Kachumber Salad', NULL, 89, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4430', 'Russian Salad', NULL, 119, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4431', 'Curd Salad', NULL, 119, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4432', 'Papdi Chat Salad', NULL, 119, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4433', 'Subhkamna Sp Salad', NULL, 139, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4434', 'Plain Curd', NULL, 79, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4435', 'Veg Raita', NULL, 129, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4436', 'Mint Raita', NULL, 129, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4437', 'Boondi Raita', NULL, 159, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4438', 'Pineapple Raita', NULL, 169, true, true, 'Papad/Salad/Raita', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4439', 'Crispy Veg', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4440', 'Crispy Corn', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4441', 'Veg Manchurian', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4442', 'Schezwan Cauliflower', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4443', 'Honey Chilli Potato', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4444', 'Chinese Bhel', NULL, 289, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4445', 'Veg Spring Roll', NULL, 279, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4446', 'Veg Lolipop', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4447', 'Chilli Gobhi', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4448', 'Chilli Chana', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4449', 'Chilli Babycorn', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4450', 'Chilli Mushroom', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4451', 'Chilli Paneer', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4452', 'Paneer Manchurian', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4453', 'Paneer 65', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4454', 'Paneer Majestic', NULL, 319, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4455', 'Paneer Dragon', NULL, 319, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4456', 'Paneer Green Garlic', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4457', 'Veg Hakka Noodles', NULL, 269, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4458', 'Desi Chowmein', NULL, 279, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4459', 'Desi Fried RIce', NULL, 279, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4460', 'Chilli Garlic Rice', NULL, 279, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4461', 'Chilli Garlic Noodles', NULL, 279, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4462', 'Schezwan Noodles', NULL, 289, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4463', 'Schezwan Fried Fice', NULL, 239, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4464', 'Mexican Fried Rice', NULL, 289, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4465', 'Singapuri Noodles', NULL, 299, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4466', 'Singapuri Fried Rice', NULL, 299, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4467', 'Paneer Fried RIce', NULL, 309, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4468', 'Triple Schezwan Rice', NULL, 319, true, true, 'Starter/Chinese', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4469', 'Veg Noodles with Paneer Chilli', NULL, 339, true, true, 'Combo', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4470', 'Veg Fried RIce with Paneer Chilli', NULL, 339, true, true, 'Combo', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4471', 'Veg Noodles with Manchurian', NULL, 319, true, true, 'Combo', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4472', 'Veg Fried RIce with Manchurian', NULL, 319, true, true, 'Combo', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4474', 'Plain French Fries', NULL, 159, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4475', 'Peri Peri French Fries', NULL, 189, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4476', 'Cheese Corn Ball', NULL, 279, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4477', 'Cheese Cigar Roll', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4478', 'Nachos with Creamy Cheese Sauce', NULL, 259, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4479', 'Alfredo Pasta(White)', NULL, 249, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4480', 'Arrabbiata Pasta (Red)', NULL, 249, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4481', 'Mama Rosa Pasta (Pink)', NULL, 249, true, true, 'Continental', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4482', 'Shubhkamna Special Pasta', 'Can Be Different from the Picture', 329, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4483', 'Bread Butter Toast', NULL, 59, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4484', 'Veg Grilled Sandwich', NULL, 139, true, true, 'Continental', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4485', 'Bombay Masala Sandwich', NULL, 149, true, true, 'Continental', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4486', 'Veg Sandwich', NULL, 129, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4487', 'Chocolate Sandwich', NULL, 149, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4488', 'Russian Sandwich', NULL, 159, true, true, 'Continental', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4489', 'Paneer Tikka Sandwich', NULL, 169, true, true, 'Continental', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4490', 'Chilli Cheese Toast', NULL, 139, true, true, 'Continental', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4491', 'Margherita Pizza', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4492', 'Farmhouse Pizza', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/5410400/pexels-photo-5410400.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4493', 'Cheese Corn Pizza', NULL, 289, true, true, 'Continental', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4494', 'Paneer TIkka Pizza', NULL, 299, true, true, 'Continental', 'https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4495', 'Steamed Momos', '6 Pieces', 179, true, true, 'Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4496', 'Fried Momos', NULL, 209, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4497', 'Kurkure Momos', NULL, 249, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4498', 'Tandoori Momos', NULL, 289, true, true, 'Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4499', 'Shubhkamna Sp. Momos', '16 Pieces', 389, true, true, 'Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4500', 'Hara Bhara Kabab', NULL, 289, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4501', 'Methi Corn Kabab', NULL, 289, true, true, 'Tandoor', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4502', 'Khasta Kabab', NULL, 289, true, true, 'Tandoor', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4503', 'Veg Seekh Kabab', NULL, 299, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4504', 'Veg Burasi Kabab', NULL, 299, true, true, 'Tandoor', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4505', 'Dahi Kabab', NULL, 299, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4506', 'Shahi Petro', NULL, 269, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4507', 'Soya Chap Tandoori', NULL, 339, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4508', 'Soya Chap Aachari', NULL, 339, true, true, 'Tandoor', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4509', 'Soya Chap Pahadi', NULL, 309, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4510', 'Soya Chap Malai', NULL, 309, true, true, 'Tandoor', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4511', 'Mushroom Tikka', NULL, 329, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4512', 'Tandoori Paneer Tikka', NULL, 339, true, true, 'Tandoor', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4513', 'Aachari Paneer Tikka', NULL, 339, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4514', 'Pahadi Paneer Tikka', NULL, 359, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4515', 'Malai Paneer Tikka', NULL, 359, true, true, 'Tandoor', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4516', 'Paneer Seekh Kabab', NULL, 369, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4517', 'Veg Tandoori Plater', NULL, 749, true, true, 'Tandoor', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4518', 'Bhindi Masala', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4519', 'Bhindi Do Pyaza', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4520', 'Bhindi Kurkure', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4521', 'Aloo Jeera', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4522', 'Kadhi Pakoda', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4523', 'Tamatar Chutney', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4524', 'Sev Tamatar', NULL, 249, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4525', 'Mix Veg', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4526', 'Veg Jalfrezi', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4527', 'Aloo Gobhi Matar', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4528', 'Veg Kadai', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4529', 'Baingan Bharta', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4530', 'Veg Kolhapuri', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4531', 'Veg Keema Kasturi', NULL, 299, false, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4532', 'Veg Patiala', NULL, 309, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4533', 'Veg Kofta', NULL, 309, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4534', 'Navratan Korma', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4535', 'Chana Masala', NULL, 269, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4536', 'Rajma Masala', NULL, 279, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4537', 'Punjabi Dum Aloo', NULL, 299, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4538', 'Kashmiri Dum Aloo', NULL, 299, true, true, 'Tandoor', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4539', 'Corn Palak', NULL, 299, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4540', 'Lasooni Palak', NULL, 299, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4541', 'Mushroom Masala', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4542', 'Methi Matar Malai', NULL, 349, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4543', 'Kaju Curry', NULL, 359, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4544', 'Kaju Masala', NULL, 359, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4545', 'Kadai Paneer', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4546', 'Paneer Masala', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4547', 'Palak Paneer', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4548', 'Paneer Punjabi', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4549', 'Matar Paneer', NULL, 319, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4550', 'Paneer Butter Masala', NULL, 349, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4551', 'Paneer Tikka Masala', NULL, 369, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4552', 'Paneer Bhurji', NULL, 369, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4553', 'Shahi Paneer', NULL, 369, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4554', 'Paneer Angara', NULL, 369, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4555', 'Malai Kofta', NULL, 369, true, true, 'Main Course', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4556', 'Shubhkamna Sp. Paneer', NULL, 399, true, true, 'Main Course', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4557', 'Dal Fry', NULL, 169, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4558', 'Dal Tadka', NULL, 189, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4559', 'Dal Dhaba', NULL, 239, true, true, 'Dal', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4560', 'Dal Kolhapuri', NULL, 239, true, true, 'Dal', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4561', 'Dal Makhni', NULL, 259, true, true, 'Dal', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4562', 'Steam RIce', NULL, 129, true, true, 'Rice', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4563', 'Jeera Rice', NULL, 159, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4564', 'Onion Tomato Rice', NULL, 179, true, true, 'Rice', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4565', 'Lemon Rice', NULL, 189, true, true, 'Rice', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4566', 'Curd Rice', NULL, 189, true, true, 'Rice', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4567', 'Dal Khichdi', NULL, 199, true, true, 'Rice', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4568', 'Masala Khichdi', NULL, 229, true, true, 'Rice', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4569', 'Veg Pulao', NULL, 199, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4570', 'Peas Pulao', NULL, 199, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4571', 'Paneer Pulao', NULL, 229, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4572', 'Kashmiri Pulao', NULL, 229, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4573', 'Veg Biryani', NULL, 259, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4574', 'Veg Dum Biryani', NULL, 259, true, true, 'Rice', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4575', 'Veg Hyadrabadi Biryani', NULL, 269, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4576', 'Paneer Tikka Biryani', NULL, 299, true, true, 'Rice', 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4577', 'Tandoori Roti', NULL, 19, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4578', 'Tandoori Butter Roti', NULL, 29, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4579', 'Plain Naan', NULL, 49, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4580', 'Butter Naan', NULL, 59, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4581', 'Garlic Naan', NULL, 89, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4582', 'Kashmiri Naan', NULL, 119, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4583', 'Misi Roti', NULL, 69, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4584', 'Garlic Roti', NULL, 49, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4585', 'Laccha Paratha', NULL, 79, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4586', 'Kulcha Plain', NULL, 59, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4587', 'Masala Kulcha', NULL, 89, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/2456435/pexels-photo-2456435.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4588', 'Bread Basket', NULL, 259, true, true, 'Roti/Breads', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4589', 'Kadhi Chawal', NULL, 179, true, true, 'Indian Combo', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4590', 'Rajma Chawal', NULL, 179, true, true, 'Indian Combo', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4591', 'Dal Makhni Chawal', NULL, 219, true, true, 'Indian Combo', 'https://images.pexels.com/photos/1109197/pexels-photo-1109197.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4592', 'Veg Thali', NULL, 219, true, true, 'Indian Combo', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4593', 'Shubhkamna Sp. Thali', NULL, 269, true, true, 'Indian Combo', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4594', 'Hot Gulab Jamun', NULL, 59, true, true, 'Desserts', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4595', 'Mawa Bati', NULL, 69, true, true, 'Desserts', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4596', 'Moong Dal Halwa', NULL, 119, true, true, 'Desserts', 'https://images.pexels.com/photos/15913441/pexels-photo-15913441.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Momo Magic Cafe (legacy shop #128)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'momo-magic-cafe-128',
    'Momo Magic Cafe',
    'Foods',
    true,
    true,
    'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    2,
    25,
    35,
    2,
    319,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4689', 'Mix Veg Steam Momo', NULL, 90, true, true, 'Steam Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4690', 'Mix Veg Steam Momo', NULL, 110, true, true, 'Steam Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4691', 'Paneer Steam Momo', NULL, 100, true, true, 'Steam Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4692', 'Paneer Steam Momo', NULL, 120, true, true, 'Steam Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4693', 'Corn cheese Steam Momo', NULL, 110, true, true, 'Steam Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4694', 'Corn cheese Steam Momo', NULL, 130, true, true, 'Steam Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4695', 'Mix Veg Fried Momo', NULL, 100, true, true, 'Fried Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4696', 'Mix Veg Fried Momo', NULL, 115, true, true, 'Fried Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4697', 'Paneer Fried Momo', NULL, 110, true, true, 'Fried Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4698', 'Paneer Fried Momo', NULL, 120, true, true, 'Fried Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4699', 'Cheese Corn Fried Momos', NULL, 115, true, true, 'Fried Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4700', 'Cheese Corn Fried Momos', NULL, 130, true, true, 'Fried Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4701', 'TN Mix Veg Dry Momos', NULL, 150, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4702', 'TN Mix Veg Afgani', NULL, 150, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4703', 'TN Mix Veg Cocktail Momo', NULL, 150, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4704', 'TN Mix Veg Achari Momo', NULL, 150, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4705', 'TN Paneer Dry Momo', NULL, 160, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4706', 'TN Paneer Afgani Momo', NULL, 160, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4707', 'TN Paneer Cocktail Momo', NULL, 160, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4708', 'TN Paneer Achari Momo', NULL, 160, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4709', 'TN Cheese Corn Dry Momos', NULL, 175, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4710', 'TN Corn cheese Afgani Momo', NULL, 175, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4711', 'TN Corn cheese Cocktail Momo', NULL, 175, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4712', 'TN Corn cheese Achari Momo', NULL, 175, true, true, 'Tandoori Momos', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4713', 'Mix Veg Pan Fried Momo', NULL, 140, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4714', 'Mix Veg Schezwan  Momo', NULL, 140, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4715', 'Mix Veg Crispy Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4716', 'Mix Veg Chilli Momo', NULL, 140, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4717', 'Mix Veg Cheese Momo', NULL, 160, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4718', 'Paneer Pan Fried Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4719', 'Paneer Schezwan Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4720', 'Paneer Crispy Momo', NULL, 175, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4721', 'Paneer Chilli Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4722', 'Paneer Cheese Momo', NULL, 175, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4723', 'Corn cheese Pan Fried Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4724', 'Corn cheese Schezwan Momo', NULL, 160, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4725', 'Corn cheese Crispy Momo', NULL, 175, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4726', 'Corn cheese Chilli Momo', NULL, 150, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4727', 'Cheese Corn Cheese Momo', NULL, 175, true, true, 'Special Magic Momo', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4728', 'Normal Fries', NULL, 70, true, true, 'Fries', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4729', 'Peri Peri Fries', NULL, 80, true, true, 'Fries', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4730', 'Masala Fries', NULL, 80, true, true, 'Fries', 'https://images.pexels.com/photos/9797126/pexels-photo-9797126.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4731', 'Cheese Fries', NULL, 100, true, true, 'Fries', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4732', 'Veg Cheese Sandwich', NULL, 90, true, true, 'Sandwich', 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4733', 'Paneer Sandwich', NULL, 100, true, true, 'Sandwich', 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4734', 'Cheese Corn Sandwich', NULL, 110, true, true, 'Sandwich', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4735', 'Plain Maggi', NULL, 65, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4736', 'Chilli Garlic Maggi', NULL, 75, true, true, 'Maggi', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4737', 'Special Maggi', NULL, 85, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4738', 'Cheese Maggi', NULL, 90, true, true, 'Maggi', 'https://images.pexels.com/photos/616404/pexels-photo-616404.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4739', 'Cheese Corn Maggi', NULL, 110, true, true, 'Maggi', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4740', 'Medium Cold Coffee', NULL, 80, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4741', 'Medium Caramel Cold Coffee', NULL, 90, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4742', 'Medium Hazelnut Cold Coffee', NULL, 90, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4743', 'Medium Chocolate Cold Coffee', NULL, 90, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4744', 'Medium Cold Coffee with Ice Cream', NULL, 130, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4745', 'Large Cold Coffee', NULL, 110, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4746', 'Large Caramel Cold Coffee', NULL, 120, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4747', 'Large Hazelnut Cold Coffee', NULL, 120, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4748', 'Large Chocolate Cold Coffee', NULL, 120, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4749', 'Large Cold Coffee with Ice Cream', NULL, 140, true, true, 'Cold Coffee', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- The Hunger Park Cafe (legacy shop #129)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'the-hunger-park-cafe-129',
    'The Hunger Park Cafe',
    'Foods',
    true,
    true,
    'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    4,
    0,
    25,
    35,
    2,
    259,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4760', 'Veg Steam Momo', NULL, 69, true, true, 'All', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4761', 'Veg Steam Paneer Momo', NULL, 99, true, true, 'All', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4762', 'Corn cheese Steam Momo', NULL, 99, true, true, 'All', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4763', 'Kathal Momo', NULL, 99, true, true, 'All', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4764', 'Afgani Veg Malai Momo', NULL, 120, true, true, 'All', 'https://images.pexels.com/photos/7363674/pexels-photo-7363674.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4765', 'Afgani Paneer Malai Momo', NULL, 140, true, true, 'All', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4766', 'Afgani Cheese Corn Malai Momo', NULL, 130, true, true, 'All', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4767', 'Afgani Kathal Malai Momo', NULL, 130, true, true, 'All', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4768', 'Peri Peri Fries', NULL, 49, true, true, 'All', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4769', 'French Fries Loaded', NULL, 99, true, true, 'All', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4772', 'Veg Classic Burger', NULL, 79, true, true, 'All', 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4773', 'Veg Cheese Burger', NULL, 89, true, true, 'All', 'https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4774', 'Double Oreo Shake', NULL, 99, true, true, 'All', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4775', 'Old School Cold Coffee', NULL, 89, true, true, 'All', 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4777', 'Blue Curacao', NULL, 89, true, true, 'All', 'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4778', 'Virgin Mojito', NULL, 89, true, true, 'All', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4780', 'Crispy Honey Chilli Potato', NULL, 100, true, true, 'All', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4781', 'Kurkure Cheese Corn Momo', NULL, 150, true, true, 'All', 'https://images.pexels.com/photos/36173262/pexels-photo-36173262.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4782', 'Kurkure Paneer Momo', NULL, 150, true, true, 'All', 'https://images.pexels.com/photos/32938725/pexels-photo-32938725.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4784', 'Cheese Corn Maggi', NULL, 110, true, true, 'All', 'https://images.pexels.com/photos/5175551/pexels-photo-5175551.jpeg?auto=compress&cs=tinysrgb&w=600', false, false),
      ('legacy-4785', 'Vegetables Maggi', NULL, 100, true, true, 'All', 'https://images.pexels.com/photos/9095802/pexels-photo-9095802.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Medicine (legacy shop #130)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'medicine-130',
    'Medicine',
    'Medicine',
    false,
    true,
    'https://images.pexels.com/photos/1907098/pexels-photo-1907098.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    125,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4750', 'Medicine', NULL, 50, true, true, 'Medicine', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Fruits (legacy shop #131)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'fruits-131',
    'Fruits',
    'Fruits',
    false,
    true,
    'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    125,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4752', 'Fruits', NULL, 50, true, true, 'Fruits', 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Groceries/Kirana (legacy shop #132)
WITH owner AS (
  SELECT id AS owner_id FROM auth.users WHERE email = 'vendor@deligro.demo' LIMIT 1
),
upsert_restaurant AS (
  INSERT INTO public.restaurants (
    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,
    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted
  )
  SELECT
    owner.owner_id,
    'groceries-kirana-132',
    'Groceries/Kirana',
    'Groceries',
    false,
    true,
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'linear-gradient(135deg,#f6c453,#e8552d)',
    ARRAY['Fast Food'],
    5,
    0,
    25,
    35,
    1,
    125,
    'Featured',
    true
  FROM owner
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    is_open = EXCLUDED.is_open,
    approved = EXCLUDED.approved,
    image_url = EXCLUDED.image_url,
    cuisines = EXCLUDED.cuisines,
    rating = EXCLUDED.rating,
    rating_count = EXCLUDED.rating_count,
    eta_min = EXCLUDED.eta_min,
    eta_max = EXCLUDED.eta_max,
    price_tier = EXCLUDED.price_tier,
    cost_for_two = EXCLUDED.cost_for_two,
    offer = EXCLUDED.offer,
    promoted = EXCLUDED.promoted
  RETURNING id
),
menu_data AS (
  SELECT * FROM (
    VALUES
      ('legacy-4753', 'Groceries', NULL, 50, true, true, 'Groceries', 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600', false, false)
  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)
)
INSERT INTO public.menu_items (
  restaurant_id, external_id, name, description, price, veg, available,
  category, image_url, popular, bestseller
)
SELECT
  upsert_restaurant.id,
  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,
  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,
  menu_data.popular, menu_data.bestseller
FROM upsert_restaurant
CROSS JOIN menu_data
ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  veg = EXCLUDED.veg,
  available = EXCLUDED.available,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  popular = EXCLUDED.popular,
  bestseller = EXCLUDED.bestseller;

-- Legacy delivery rules (reference — wire into app config separately):
-- min order ₹49, free delivery above ₹499

COMMIT;

-- Verify import (this is what the SQL Editor result should show):
SELECT
  (SELECT count(*)::int FROM public.restaurants) AS total_restaurants,
  (SELECT count(*)::int FROM public.menu_items WHERE external_id LIKE 'legacy-%') AS legacy_menu_items,
  (SELECT count(*)::int FROM public.restaurants WHERE is_open = true) AS open_restaurants;

-- Expected after full seed: ~62 restaurants, ~3690 legacy menu items