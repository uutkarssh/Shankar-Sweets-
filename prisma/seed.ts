import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedItem = {
  name: string;
  description: string;
  category: string;
  price: number;
  variantType: "single" | "size" | "portion" | "count";
  priceSmall?: number;
  priceLarge?: number;
  priceHalf?: number;
  priceFull?: number;
  weightBased?: boolean;
  image?: string;
  featured?: boolean;
  bestSeller?: boolean;
  sortOrder?: number;
};

const ITEMS: SeedItem[] = [
  // ---------- PIZZA ----------
  { name: "Margherita", description: "Classic herbs and molten mozzarella on a hand-tossed base.", category: "Pizza", price: 89, variantType: "size", priceSmall: 89, priceLarge: 139, image: "/images/categories/pizza.png", featured: true, bestSeller: true, sortOrder: 1 },
  { name: "Authentic Veg", description: "Red paprika, black olives, capsicum and onion.", category: "Pizza", price: 149, variantType: "size", priceSmall: 149, priceLarge: 219, image: "/images/items/corn-pizza.png", featured: true, sortOrder: 2 },
  { name: "Golden Corn Delight", description: "Sweet corn and cheese, a crowd favourite.", category: "Pizza", price: 99, variantType: "size", priceSmall: 99, priceLarge: 149, image: "/images/items/corn-pizza.png", featured: true, bestSeller: true, sortOrder: 3 },
  { name: "Paneer Special", description: "Paneer, jalapeño and signature spices.", category: "Pizza", price: 149, variantType: "size", priceSmall: 149, priceLarge: 219, image: "/images/items/paneer-pizza.png", featured: true, sortOrder: 4 },
  { name: "Classic Onion Capsicum", description: "Onion and capsicum with a mild spice blend.", category: "Pizza", price: 129, variantType: "size", priceSmall: 129, priceLarge: 199, image: "/images/categories/pizza.png", sortOrder: 5 },
  { name: "Kulhad Pizza", description: "Cheesy mini pizza baked in an earthen kulhad.", category: "Pizza", price: 100, variantType: "single", image: "/images/items/paneer-pizza.png", sortOrder: 6 },

  // ---------- BURGER ----------
  { name: "Veggie Burger", description: "Crispy veg patty with fresh veggies.", category: "Burger", price: 50, variantType: "single", image: "/images/categories/burger.png", featured: true, sortOrder: 1 },
  { name: "Paneer Burger", description: "Grilled paneer tikka patty, mint chutney.", category: "Burger", price: 60, variantType: "single", image: "/images/categories/burger.png", sortOrder: 2 },
  { name: "Cheese Burger", description: "Double cheese melt with toasted bun.", category: "Burger", price: 70, variantType: "single", image: "/images/categories/burger.png", bestSeller: true, sortOrder: 3 },

  // ---------- MAGGIE ----------
  { name: "Veg Maggie", description: "Masala maggie with seasonal vegetables.", category: "Maggie", price: 60, variantType: "single", image: "/images/categories/maggie.png", featured: true, sortOrder: 1 },
  { name: "Schezwan Maggie", description: "Spicy schezwan sauce, crunchy veggies.", category: "Maggie", price: 70, variantType: "single", image: "/images/categories/maggie.png", sortOrder: 2 },
  { name: "Cheese Maggie", description: "Loaded with extra molten cheese.", category: "Maggie", price: 100, variantType: "single", image: "/images/categories/maggie.png", bestSeller: true, sortOrder: 3 },

  // ---------- HOT BEVERAGE ----------
  { name: "Chai", description: "Strong cutting chai brewed fresh.", category: "Hot Beverage", price: 10, variantType: "single", image: "/images/categories/hot-beverage.png", featured: true, sortOrder: 1 },
  { name: "Coffee", description: "Hot frothy filter coffee.", category: "Hot Beverage", price: 20, variantType: "single", image: "/images/categories/hot-beverage.png", sortOrder: 2 },

  // ---------- CHAAT ----------
  { name: "Chola Samosa", description: "Spicy chickpeas topped over crisp samosa.", category: "Chaat", price: 20, variantType: "single", image: "/images/categories/chaat.png", featured: true, sortOrder: 1 },
  { name: "Samosa", description: "Flaky samosa stuffed with potato peas. ₹6 per piece.", category: "Chaat", price: 6, variantType: "count", image: "/images/categories/chaat.png", sortOrder: 2 },
  { name: "Meetha Samosa", description: "Sweet stuffed samosa, a festive special.", category: "Chaat", price: 12, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 3 },
  { name: "Khasta Damaloo", description: "Crisp shell with spiced potato filling.", category: "Chaat", price: 20, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 4 },
  { name: "Lassi", description: "Thick creamy sweet lassi, topped with malai.", category: "Chaat", price: 40, variantType: "single", image: "/images/items/lassi.png", featured: true, bestSeller: true, sortOrder: 5 },
  { name: "Tamatar Chaat", description: "Tangy tomato chaat with tamarind chutney.", category: "Chaat", price: 30, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 6 },
  { name: "Tikki Chaat", description: "Crisp potato tikkis, curd and sev.", category: "Chaat", price: 25, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 7 },
  { name: "Phulki", description: "Puffed lentil balls in spiced curd. ₹10 for 4 pcs.", category: "Chaat", price: 10, variantType: "count", image: "/images/categories/chaat.png", sortOrder: 8 },
  { name: "Papdi Chaat", description: "Papdi, curd, chutneys and pomegranate.", category: "Chaat", price: 30, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 9 },
  { name: "Dahi Bada", description: "Soft badas in curd. ₹30 full plate / ₹20 half.", category: "Chaat", price: 30, variantType: "portion", priceHalf: 20, priceFull: 30, image: "/images/categories/chaat.png", sortOrder: 10 },
  { name: "Gulab Jamun", description: "Warm syrup-soaked golden gulab jamun.", category: "Chaat", price: 20, variantType: "single", image: "/images/brand/promo-gulabjamun.png", featured: true, bestSeller: true, sortOrder: 11 },
  { name: "Rajbhog", description: "Large spongy chenna ball in saffron syrup.", category: "Chaat", price: 30, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 12 },
  { name: "Rasmalai", description: "Soft chenna discs in cardamom malai.", category: "Chaat", price: 30, variantType: "single", image: "/images/categories/chaat.png", sortOrder: 13 },

  // ---------- CHINESE ----------
  { name: "Chowmein", description: "Wok-tossed veg hakka noodles.", category: "Chinese", price: 35, variantType: "portion", priceHalf: 35, priceFull: 60, image: "/images/categories/chinese.png", featured: true, sortOrder: 1 },
  { name: "Paneer Chowmein", description: "Chowmein tossed with paneer and sauces.", category: "Chinese", price: 50, variantType: "portion", priceHalf: 50, priceFull: 90, image: "/images/categories/chinese.png", sortOrder: 2 },
  { name: "French Fries", description: "Golden crisp salted fries.", category: "Chinese", price: 30, variantType: "portion", priceHalf: 30, priceFull: 60, image: "/images/items/spring-roll.png", featured: true, sortOrder: 3 },
  { name: "Spring Roll", description: "Crisp rolls with veg stuffing.", category: "Chinese", price: 25, variantType: "portion", priceHalf: 25, priceFull: 50, image: "/images/items/spring-roll.png", bestSeller: true, sortOrder: 4 },
  { name: "Fried Rice", description: "Veg fried rice with soy and veggies.", category: "Chinese", price: 30, variantType: "portion", priceHalf: 30, priceFull: 60, image: "/images/categories/chinese.png", sortOrder: 5 },
  { name: "Manchurian", description: "Veg balls in tangy manchurian gravy.", category: "Chinese", price: 40, variantType: "portion", priceHalf: 40, priceFull: 80, image: "/images/categories/chinese.png", sortOrder: 6 },
  { name: "Steam Veg Momos", description: "₹25 for 3 pcs / ₹40 for 6 pcs.", category: "Chinese", price: 25, variantType: "portion", priceHalf: 25, priceFull: 40, image: "/images/items/momos.png", featured: true, bestSeller: true, sortOrder: 7 },
  { name: "Fried Momos", description: "₹20 for 5 pcs / ₹40 for 10 pcs.", category: "Chinese", price: 20, variantType: "portion", priceHalf: 20, priceFull: 40, image: "/images/items/momos.png", sortOrder: 8 },
];

const CATEGORIES = [
  { name: "Sweets", slug: "sweets", icon: "/images/categories/sweets.png", sortOrder: 1 },
  { name: "Bakery", slug: "bakery", icon: "/images/categories/bakery.png", sortOrder: 2 },
  { name: "Ice Cream", slug: "ice-cream", icon: "/images/categories/ice-cream.png", sortOrder: 3 },
  { name: "Chaat", slug: "chaat", icon: "/images/categories/chaat.png", sortOrder: 4 },
  { name: "Snacks", slug: "snacks", icon: "/images/categories/burger.png", sortOrder: 5 },
  { name: "Pizza", slug: "pizza", icon: "/images/categories/pizza.png", sortOrder: 6 },
  { name: "Burger", slug: "burger", icon: "/images/categories/burger.png", sortOrder: 7 },
  { name: "Maggie", slug: "maggie", icon: "/images/categories/maggie.png", sortOrder: 8 },
  { name: "Chinese", slug: "chinese", icon: "/images/categories/chinese.png", sortOrder: 9 },
  { name: "Hot Beverage", slug: "hot-beverage", icon: "/images/categories/hot-beverage.png", sortOrder: 10 },
];

async function main() {
  console.log("Seeding Shankar Sweets & Bakery...");

  // Upsert restaurant config
  await db.restaurantConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Categories
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, sortOrder: c.sortOrder },
      create: { ...c },
    });
  }

  const categories = await db.category.findMany();
  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  // Clear existing items then reseed (idempotent for fresh dev)
  await db.item.deleteMany({});

  for (const it of ITEMS) {
    const categoryId = catMap.get(it.category);
    if (!categoryId) {
      console.warn(`No category for ${it.name} (${it.category})`);
      continue;
    }
    await db.item.create({
      data: {
        name: it.name,
        description: it.description,
        categoryId,
        price: it.price,
        priceSmall: it.priceSmall,
        priceLarge: it.priceLarge,
        priceHalf: it.priceHalf,
        priceFull: it.priceFull,
        weightBased: it.weightBased ?? false,
        variantType: it.variantType,
        image: it.image,
        featured: it.featured ?? false,
        bestSeller: it.bestSeller ?? false,
        veg: true,
        inStock: true,
        sortOrder: it.sortOrder ?? 0,
        rating: 4.5 + Math.random() * 0.4,
        ratingCount: Math.floor(20 + Math.random() * 200),
      },
    });
  }

  console.log(`Seeded ${ITEMS.length} items across ${CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
