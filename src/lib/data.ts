import type {
  Address,
  Category,
  Order,
  Restaurant,
} from "@/types";

/* ============================================================
   Static mock data — Phase 1 (UI/UX only, no backend).
   Food photography "supplies the color". Images are served from
   Pexels; the per-restaurant gradient tint stays underneath as the
   backdrop while each photo loads.
   ============================================================ */

/** Build a Pexels CDN image URL from a photo id. */
const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const CATEGORIES: Category[] = [
  { id: "biryani", label: "Biryani", emoji: "🍚" },
  { id: "pizza", label: "Pizza", emoji: "🍕" },
  { id: "healthy", label: "Healthy", emoji: "🥗" },
  { id: "burgers", label: "Burgers", emoji: "🍔" },
  { id: "chinese", label: "Chinese", emoji: "🥡" },
  { id: "desserts", label: "Desserts", emoji: "🍰" },
  { id: "south", label: "South Indian", emoji: "🥞" },
  { id: "rolls", label: "Rolls", emoji: "🌯" },
];

export const RESTAURANTS: Restaurant[] = [
  {
    slug: "saffron-kitchen",
    name: "Saffron Kitchen",
    tagline: "Slow-cooked biryanis & royal curries",
    cuisines: ["North Indian", "Biryani"],
    rating: 4.6,
    ratingCount: 1200,
    etaMin: 22,
    etaMax: 28,
    priceTier: 2,
    costForTwo: 480,
    distanceKm: 1.4,
    offer: "30% OFF up to ₹120",
    promoted: true,
    open: true,
    accentTint: "linear-gradient(135deg,#f6c453,#e8552d)",
    image: px(958545),
    categories: ["Popular", "Biryani", "Breads", "Curries"],
    menu: [
      {
        id: "sk-1",
        image: px(12737656),
        name: "Hyderabadi Dum Biryani",
        description: "Slow-cooked basmati, saffron, tender chicken",
        price: 320,
        category: "Biryani",
        veg: false,
        popular: true,
        bestseller: true,
      },
      {
        id: "sk-2",
        image: px(9797126),
        name: "Paneer Butter Masala",
        description: "Creamy tomato gravy, house paneer",
        price: 260,
        category: "Curries",
        veg: true,
        popular: true,
      },
      {
        id: "sk-3",
        image: px(461198),
        name: "Garlic Naan",
        description: "Tandoor-baked, fresh garlic & butter",
        price: 70,
        category: "Breads",
        veg: true,
      },
      {
        id: "sk-4",
        image: px(7625056),
        name: "Veg Dum Biryani",
        description: "Fragrant rice, seasonal vegetables, mint",
        price: 240,
        category: "Biryani",
        veg: true,
      },
      {
        id: "sk-5",
        image: px(1109197),
        name: "Butter Chicken",
        description: "Charred tandoori chicken, silky makhani gravy",
        price: 340,
        category: "Curries",
        veg: false,
        popular: true,
      },
      {
        id: "sk-6",
        image: px(15913441),
        name: "Gulab Jamun (2 pc)",
        description: "Warm, syrup-soaked, cardamom",
        price: 90,
        category: "Popular",
        veg: true,
        soldOut: true,
      },
    ],
  },
  {
    slug: "burger-republic",
    name: "Burger Republic",
    tagline: "Smash burgers & loaded fries",
    cuisines: ["Fast Food"],
    rating: 4.4,
    ratingCount: 860,
    etaMin: 18,
    etaMax: 24,
    priceTier: 2,
    costForTwo: 400,
    distanceKm: 2.1,
    offer: "TODAY · 30% OFF",
    promoted: true,
    open: true,
    accentTint: "linear-gradient(135deg,#f9a03f,#e8552d)",
    image: px(1639557),
    categories: ["Popular", "Burgers", "Sides", "Shakes"],
    menu: [
      {
        id: "br-1",
        image: px(2280545),
        name: "Double Smash Cheeseburger",
        description: "Two patties, aged cheddar, house sauce",
        price: 280,
        category: "Burgers",
        veg: false,
        bestseller: true,
        popular: true,
      },
      {
        id: "br-2",
        image: px(1639557),
        name: "Paneer Zinger Burger",
        description: "Crispy paneer, slaw, chipotle mayo",
        price: 220,
        category: "Burgers",
        veg: true,
        popular: true,
      },
      {
        id: "br-3",
        image: px(1146760),
        name: "Loaded Peri Fries",
        description: "Peri-peri, cheese, jalapeño",
        price: 160,
        category: "Sides",
        veg: true,
      },
      {
        id: "br-4",
        image: px(3026808),
        name: "Belgian Chocolate Shake",
        description: "Thick, rich, real cocoa",
        price: 180,
        category: "Shakes",
        veg: true,
      },
    ],
  },
  {
    slug: "green-bowl",
    name: "Green Bowl",
    tagline: "Salads, grain bowls & cold-press",
    cuisines: ["Healthy"],
    rating: 4.7,
    ratingCount: 540,
    etaMin: 20,
    etaMax: 26,
    priceTier: 2,
    costForTwo: 450,
    distanceKm: 1.8,
    open: true,
    accentTint: "linear-gradient(135deg,#7bc47f,#2e7d5b)",
    image: px(1213710),
    categories: ["Popular", "Bowls", "Salads", "Juices"],
    menu: [
      {
        id: "gb-1",
        image: px(5175551),
        name: "High-Protein Chicken Bowl",
        description: "Grilled chicken, quinoa, avocado, greens",
        price: 320,
        category: "Bowls",
        veg: false,
        bestseller: true,
        popular: true,
      },
      {
        id: "gb-2",
        image: px(1640777),
        name: "Buddha Bowl",
        description: "Chickpea, roasted veg, tahini",
        price: 280,
        category: "Bowls",
        veg: true,
        popular: true,
      },
      {
        id: "gb-3",
        image: px(616404),
        name: "Cold-Press Green Juice",
        description: "Spinach, apple, ginger, lime",
        price: 140,
        category: "Juices",
        veg: true,
      },
    ],
  },
  {
    slug: "napoli-woodfire",
    name: "Napoli Woodfire",
    tagline: "Neapolitan wood-fired pizza",
    cuisines: ["Italian"],
    rating: 4.5,
    ratingCount: 970,
    etaMin: 28,
    etaMax: 35,
    priceTier: 3,
    costForTwo: 700,
    distanceKm: 3.4,
    offer: "Free garlic bread over ₹499",
    open: true,
    accentTint: "linear-gradient(135deg,#e86a4b,#b0341a)",
    image: px(825661),
    categories: ["Popular", "Pizza", "Pasta", "Starters"],
    menu: [
      {
        id: "np-1",
        image: px(376464),
        name: "Margherita DOP",
        description: "San Marzano, fior di latte, basil",
        price: 420,
        category: "Pizza",
        veg: true,
        bestseller: true,
        popular: true,
      },
      {
        id: "np-2",
        image: px(9095802),
        name: "Diavola",
        description: "Spicy salami, chilli, mozzarella",
        price: 520,
        category: "Pizza",
        veg: false,
        popular: true,
      },
      {
        id: "np-3",
        image: px(1279330),
        name: "Truffle Mushroom Pasta",
        description: "Tagliatelle, cream, truffle oil",
        price: 480,
        category: "Pasta",
        veg: true,
      },
    ],
  },
  {
    slug: "dragon-wok",
    name: "Dragon Wok",
    tagline: "Indo-Chinese, tossed to order",
    cuisines: ["Chinese"],
    rating: 4.2,
    ratingCount: 1500,
    etaMin: 25,
    etaMax: 32,
    priceTier: 2,
    costForTwo: 500,
    distanceKm: 2.7,
    open: false,
    accentTint: "linear-gradient(135deg,#c0392b,#7a1f16)",
    image: px(1907098),
    categories: ["Popular", "Starters", "Noodles", "Rice"],
    menu: [
      {
        id: "dw-1",
        image: px(2456435),
        name: "Chilli Garlic Noodles",
        description: "Wok-tossed, scallion, house chilli oil",
        price: 220,
        category: "Noodles",
        veg: true,
        popular: true,
      },
      {
        id: "dw-2",
        image: px(5410400),
        name: "Chicken Manchurian",
        description: "Crispy, tangy, garlic-forward",
        price: 260,
        category: "Starters",
        veg: false,
        bestseller: true,
      },
    ],
  },
  {
    slug: "sweet-carousel",
    name: "Sweet Carousel",
    tagline: "Desserts, bakes & gelato",
    cuisines: ["Desserts"],
    rating: 4.8,
    ratingCount: 430,
    etaMin: 15,
    etaMax: 22,
    priceTier: 2,
    costForTwo: 350,
    distanceKm: 1.1,
    offer: "Buy 1 Get 1 on gelato",
    open: true,
    accentTint: "linear-gradient(135deg,#f4a6c0,#c0568a)",
    image: px(4110251),
    categories: ["Popular", "Cakes", "Gelato", "Bakes"],
    menu: [
      {
        id: "sc-1",
        image: px(291528),
        name: "Molten Chocolate Cake",
        description: "Warm centre, vanilla bean scoop",
        price: 190,
        category: "Cakes",
        veg: true,
        bestseller: true,
        popular: true,
      },
      {
        id: "sc-2",
        image: px(6412834),
        name: "Pistachio Gelato",
        description: "Sicilian pistachio, double churned",
        price: 160,
        category: "Gelato",
        veg: true,
      },
    ],
  },
];

export function getRestaurant(slug: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.slug === slug);
}

export function getAllMenuItems() {
  return RESTAURANTS.flatMap((r) =>
    r.menu.map((m) => ({ ...m, restaurant: r }))
  );
}

/** Map a past order's lines into cart lines (looks up veg from the menu). */
export function cartLinesFromOrder(order: Order): import("@/types").CartLine[] {
  const menu = getRestaurant(order.restaurantSlug)?.menu ?? [];
  return order.lines.map((l) => ({
    itemId: l.itemId,
    name: l.name,
    price: l.price,
    qty: l.qty,
    veg: menu.find((m) => m.id === l.itemId)?.veg ?? true,
  }));
}

/* ---------- Orders ---------- */
export const ACTIVE_ORDER: Order = {
  id: "DLG-4821",
  restaurantSlug: "saffron-kitchen",
  restaurantName: "Saffron Kitchen",
  status: "ON_THE_WAY",
  placedAt: "Today, 8:24 PM",
  etaMinutes: 12,
  total: 785,
  lines: [
    { itemId: "sk-1", name: "Hyderabadi Dum Biryani", qty: 1, price: 320 },
    { itemId: "sk-3", name: "Garlic Naan", qty: 2, price: 70 },
    { itemId: "sk-2", name: "Paneer Butter Masala", qty: 1, price: 260 },
  ],
  rider: {
    name: "Shantanu G.",
    rating: 4.9,
    vehicle: "Bike",
    phone: "+91 98••• ••210",
  },
};

export const PAST_ORDERS: Order[] = [
  {
    id: "DLG-4790",
    restaurantSlug: "burger-republic",
    restaurantName: "Burger Republic",
    status: "DELIVERED",
    placedAt: "Fri, 9:10 PM",
    total: 640,
    lines: [
      { itemId: "br-1", name: "Double Smash Cheeseburger", qty: 2, price: 280 },
      { itemId: "br-3", name: "Loaded Peri Fries", qty: 1, price: 160 },
    ],
  },
  {
    id: "DLG-4712",
    restaurantSlug: "green-bowl",
    restaurantName: "Green Bowl",
    status: "DELIVERED",
    placedAt: "Wed, 1:32 PM",
    total: 460,
    lines: [
      { itemId: "gb-1", name: "High-Protein Chicken Bowl", qty: 1, price: 320 },
      { itemId: "gb-3", name: "Cold-Press Green Juice", qty: 1, price: 140 },
    ],
  },
  {
    id: "DLG-4655",
    restaurantSlug: "saffron-kitchen",
    restaurantName: "Saffron Kitchen",
    status: "DELIVERED",
    placedAt: "Last Fri, 8:40 PM",
    total: 720,
    lines: [
      { itemId: "sk-1", name: "Hyderabadi Dum Biryani", qty: 2, price: 320 },
    ],
  },
];

export const ADDRESSES: Address[] = [
  {
    id: "a1",
    label: "Home",
    line: "42,Ward NO 07, Mohhbtta Road, Bemetara, Chhattisgarh 491335",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Work",
    line: "2nd Floor, Apex Tower, Bemetara, Chhattisgarh 491335",
  },
];

export const USER = {
  name: "Gaurav Mirjha",
  phone: "+91 7987265706",
  initials: "GM",
  memberSince: "2024",
  orders: 47,
};
