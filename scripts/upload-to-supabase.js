const { createClient } = require("@libsql/client");
const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const turso = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const BUCKET = process.env.SUPABASE_MENU_BUCKET || "menu-images";

// Map item names to local image files
const itemImageMap = {
  "Margherita": "margherita.png",
  "Authentic Veg": "authentic-veg.png",
  "Golden Corn Delight": "golden-corn-delight.png",
  "Paneer Special": "paneer-special.png",
  "Classic Onion Capsicum": "classic-onion-capsicum.png",
  "Kulhad Pizza": "kulhad-pizza.png",
  "Veggie Burger": "veggie-burger.png",
  "Paneer Burger": "paneer-burger.png",
  "Cheese Burger": "cheese-burger.png",
  "Veg Maggie": "veg-maggie.png",
  "Schezwan Maggie": "schezwan-maggie.png",
  "Cheese Maggie": "cheese-maggie.png",
  "Chai": "chai.png",
  "Coffee": "coffee.png",
  "Chola Samosa": "chola-samosa.png",
  "Samosa": "samosa.png",
  "Meetha Samosa": "meetha-samosa.png",
  "Khasta Damaloo": "khasta-damaloo.png",
  "Lassi": "lassi.png",
  "Tamatar Chaat": "tamatar-chaat.png",
  "Tikki Chaat": "tikki-chaat.png",
  "Phulki": "phulki.png",
  "Papdi Chaat": "papdi-chaat.png",
  "Dahi Bada": "dahi-bada.png",
  "Gulab Jamun": "gulab-jamun.png",
  "Rajbhog": "rajbhog.png",
  "Rasmalai": "rasmalai.png",
  "Chowmein": "chowmein.png",
  "Paneer Chowmein": "paneer-chowmein.png",
  "French Fries": "french-fries.png",
  "Spring Roll": "spring-roll.png",
  "Fried Rice": "fried-rice.png",
  "Manchurian": "manchurian.png",
  "Steam Veg Momos": "steam-veg-momos.png",
  "Fried Momos": "fried-momos.png",
};

// Map category slugs to local image files
const categoryImageMap = {
  "pizza": "pizza.png",
  "burger": "burger.png",
  "maggie": "maggie.png",
  "hot-beverage": "hot-beverage.png",
  "chaat": "chaat.png",
  "chinese": "chinese.png",
  "sweets": "sweets.png",
  "bakery": "bakery.png",
  "ice-cream": "ice-cream.png",
};

async function uploadToSupabase(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) {
    console.error("Upload error:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

async function main() {
  console.log("Uploading item images to Supabase Storage...");
  let itemCount = 0;
  let itemFail = 0;

  for (const [itemName, imgFile] of Object.entries(itemImageMap)) {
    const localPath = path.join("/home/z/my-project/public/images/items", imgFile);
    if (!fs.existsSync(localPath)) {
      console.log(`  SKIP ${itemName}: file not found (${imgFile})`);
      itemFail++;
      continue;
    }
    const storagePath = `items/${imgFile}`;
    const url = await uploadToSupabase(localPath, storagePath);
    if (url) {
      await turso.execute({
        sql: "UPDATE Item SET image = ? WHERE name = ?",
        args: [url, itemName],
      });
      console.log(`  OK ${itemName} -> ${url.substring(0, 80)}...`);
      itemCount++;
    } else {
      console.log(`  FAIL ${itemName}`);
      itemFail++;
    }
  }

  console.log(`\nItems: ${itemCount} uploaded, ${itemFail} failed`);

  console.log("\nUploading category images to Supabase Storage...");
  let catCount = 0;

  for (const [slug, imgFile] of Object.entries(categoryImageMap)) {
    const localPath = path.join("/home/z/my-project/public/images/categories", imgFile);
    if (!fs.existsSync(localPath)) {
      console.log(`  SKIP ${slug}: file not found`);
      continue;
    }
    const storagePath = `categories/${imgFile}`;
    const url = await uploadToSupabase(localPath, storagePath);
    if (url) {
      await turso.execute({
        sql: "UPDATE Category SET icon = ? WHERE slug = ?",
        args: [url, slug],
      });
      console.log(`  OK ${slug} -> ${url.substring(0, 80)}...`);
      catCount++;
    }
  }

  console.log(`\nCategories: ${catCount} uploaded`);

  // Also upload the logo and promo image
  console.log("\nUploading brand images...");
  const brandImages = [
    { local: "/home/z/my-project/public/images/brand/logo.png", storage: "brand/logo.png" },
    { local: "/home/z/my-project/public/images/brand/promo-gulabjamun.png", storage: "brand/promo-gulabjamun.png" },
  ];
  for (const { local, storage } of brandImages) {
    if (fs.existsSync(local)) {
      const url = await uploadToSupabase(local, storage);
      console.log(`  ${storage}: ${url ? "OK" : "FAIL"}`);
    }
  }

  // Verify
  const items = await turso.execute("SELECT COUNT(*) as n FROM Item WHERE image IS NOT NULL");
  const cats = await turso.execute("SELECT COUNT(*) as n FROM Category WHERE icon IS NOT NULL");
  console.log(`\nVerification: ${items.rows[0].n} items with images, ${cats.rows[0].n} categories with icons`);
  console.log("Done!");
}

main().catch(console.error).finally(() => process.exit(0));
