# Shankar Sweets & Bakery — Project Worklog

## Current Project Status

**Phase 1 Complete — Working preview deployed.** The Shankar Sweets & Bakery website is fully functional with a complete customer-facing storefront and admin panel, matching the requested brand identity (burgundy `#641C27`, gold `#D4A83E`, ivory `#FFF8E8`, cream `#F5E8CF`).

The site is live on the preview panel (via the Caddy gateway on port 81 → Next.js dev server on port 3000). All core flows have been browser-verified end-to-end.

### Tech Stack
- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- Prisma ORM with local SQLite (schema mirrors the Turso schema; Turso credentials are in `.env` and can be activated by adding `@prisma/adapter-libsql`)
- Zustand (cart store, persisted) + sonner toasts
- Poppins (headings) + Outfit (body) fonts — locked per brand spec
- PWA manifest + service worker (offline-safe shell)

## Current Goals / Completed Modifications / Verification Results

### Completed (all browser-verified via agent-browser)

**Customer storefront:**
- Home page — burgundy ornamental header with gold SHANKAR logo, "Deliver to" widget, notification + account icons; cream search bar; 10 rounded category tiles with gold borders and real food photos; dark-maroon promo carousel (3 slides, auto-rotating, dot indicators, gold "ORDER NOW" button, dish photo bleed); info strip (open hours, free delivery, radius, phone); Featured Items + Best Sellers + Chaat Corner sections with fully-rounded product cards (image + card both rounded ~16-20px), veg indicator, wishlist heart, star rating badge, best-seller badge, variant selector (Small/Large, Half/Full), burgundy "Add" button with gold accent; burgundy footer with business info; fixed 4-tab bottom nav (Home, Menu, Cart, Offers) with gold active state + cart badge.
- Menu page — grouped by category, search + category filter, "Coming Soon" placeholders for empty Sweets/Bakery/Ice Cream categories.
- Item detail page — large rounded image, variant + quantity selectors, sticky add-to-cart bar.
- Cart page — line items with qty steppers, delivery address summary, live bill (subtotal + fee + total), sticky checkout bar.
- Checkout page — contact details, address picker (draggable pin on self-contained map, "Use Current Location" geolocation, live distance + fee display, PIN validation), order notes, COD + UPI payment (with screenshot upload), bill, place order → "Order Confirmed" success screen with order number.
- Orders tracking page — search by phone, visual status stepper (Placed → Accepted → Preparing → Out for Delivery → Delivered).
- Offers + Profile pages.

**Delivery logic (per spec):**
- Hard 5km cutoff — blocks checkout with clear message.
- Above ₹300 within 5km → FREE.
- At/below ₹300 within 5km → linear ₹10 (0km) → ₹70 (5km), rounded to nearest ₹5.
- Fee shown immediately once address is set.

**Admin panel (`/admin`, hardcoded login, no public links):**
- Login page (burgundy/gold, hardcoded `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env).
- Orders dashboard — all orders with status filters (PENDING/ACCEPTED/PREPARING/OUT_FOR_DELIVERY/DELIVERED/REJECTED), inline accept/reject/status-advance buttons, call/location links, UPI payment approve/reject.
- Menu management — full CRUD for items + categories, variant types (single/size/portion/count/weight), image URL, featured/best-seller/veg/in-stock toggles, modal editor.
- Featured reorder — drag-and-drop, save order.
- Settings — Accept/Stop Orders toggle (shows "We'll be open soon" when stopped), business info, delivery config, UPI ID, hours.

**Backend / integrations:**
- API routes: `/api/menu`, `/api/config`, `/api/orders` (POST creates order + validates radius + checks accepting flag), `/api/orders/track`, `/api/admin/auth`, `/api/admin/orders` (GET/PATCH), `/api/admin/menu` (CRUD), `/api/admin/config` (GET/PATCH), `/api/admin/featured` (reorder).
- Telegram notifications: single message per order, edited in place on status change, inline callback buttons (accept/reject/prepare/deliver/payment), multi-chat support.
- Stable admin session token (SHA-256 of admin credentials — survives server restarts).
- PWA manifest + service worker (network-first navigations, cache-first assets, no offline error page).

### Verification Results (agent-browser, 2026-09-13)
- Homepage renders: header, 10 categories, promo carousel, featured grid, bottom nav — HTTP 200, no console errors.
- VLM confirmed: burgundy header, gold logo, rounded category tiles, dark maroon promo banner, 4-tab burgundy bottom nav with gold active state. No blue/indigo.
- Add to cart → cart badge updates → cart page shows items + bill.
- Checkout: filled form, saved address (distance + fee computed), placed order → "Order Confirmed" (order #SS260913-1171).
- Order persisted to DB (verified via Prisma).
- Admin login → orders dashboard → saw the order → clicked Accept → status changed PENDING→ACCEPTED, "Preparing" button appeared.
- Admin Settings tab: Accepting Orders toggle, all business/delivery fields populated.
- ESLint: clean (0 errors, 0 warnings).

### Images Generated
- Brand: real uploaded gold "SHANKAR Taste the Tradition" logo + AI promo dish (gulab jamun).
- Categories (9/9): pizza, burger, maggie, hot-beverage, chaat, chinese, sweets, bakery, ice-cream.
- Items (5): paneer-pizza, corn-pizza, spring-roll, momos, lassi.

## Unresolved Issues / Risks / Next-Phase Priorities

### Known limitations
1. **Database**: Currently using local SQLite (`db/custom.db`) for the working preview. The Turso credentials are in `.env` (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN). To switch to Turso, add `@prisma/adapter-libsql` and enable `previewFeatures = ["driverAdapters"]` in the Prisma schema, then point `DATABASE_URL` at the Turso URL. The schema is identical so it's a drop-in. The user's existing Turso tables were not altered.
2. **Supabase Auth/Storage**: Customer auth (email+password, Google OAuth) and Supabase Storage image uploads (`menu-images` bucket) are scaffolded via env vars but not yet wired into the UI — the checkout currently uses a guest flow (login "required only at checkout" is informational). Next phase: wire `@supabase/supabase-js` for auth + storage.
3. **Gemini Vision payment verification**: The UPI flow uploads a screenshot and stores it, but auto-verification via Gemini Vision is not yet implemented (GEMINI_API_KEY is a placeholder in env). Currently admin manually approves UPI payments.
4. **Leaflet maps**: Replaced with a self-contained draggable-pin map (no external tile dependency) to avoid network tile fetches in the sandbox. Can swap to Leaflet+OSM Nominatim later if needed.

### Priority recommendations for next phase
1. **Wire Supabase Auth** — customer email/password + Google OAuth at checkout, persist user → order link.
2. **Wire Supabase Storage** — admin multi-image upload (max 5/item) to `menu-images` bucket.
3. **Gemini Vision** — auto-verify UPI payment screenshots before marking paid.
4. **Switch to Turso** — add libsql adapter for production database.
5. **Leaflet + OSM Nominatim** — real map tiles + geocoding for address search.
6. **Telegram webhook** — receive callback button presses (currently one-way notifications + in-app admin actions; the callback buttons need a webhook endpoint to handle Telegram button presses).
7. **More menu items** — populate Sweets/Bakery/Ice Cream categories with weight-based pricing via admin.

### Architecture notes
- All API routes use `force-dynamic` to ensure fresh data.
- Cart state persisted to localStorage via Zustand `persist` middleware.
- Admin auth: stable SHA-256 token in httpOnly cookie, 7-day expiry.
- Delivery fee calc: `calculateDeliveryFee()` in `src/lib/constants.ts` — single source of truth used by cart, checkout, and the orders API.
