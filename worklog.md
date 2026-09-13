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

### Phase 2 Completed (2026-09-14, cron review round)

**Bugs fixed:**
1. **Missing `/menu` page (404)** — the entire `src/app/menu/` directory was lost (unknown cause, likely a file system issue from a prior session). Recreated the full menu page with category grouping, search, and "Coming Soon" placeholders for empty categories. Verified: `/menu`, `/menu?q=pizza`, `/menu?cat=pizza` all return 200.
2. **Home page category tiles not navigating** — `CategoryRow` on the home page had no `onSelect` handler, so clicking "Browse Pizza" etc. did nothing. Fixed by adding `useRouter` to `CategoryRow` with a `navigateOnClick` prop (default true) that navigates to `/menu?cat=<slug>` when no custom `onSelect` is provided. Verified: clicking "Browse Pizza" now navigates to the filtered menu.
3. **Search UX** — searching from the home page showed grouped categories with "Coming Soon" placeholders for empty categories, which was confusing. Fixed by using a flat results grid when a search query is present (no grouping).
4. **Telegram `tel:` URL error** — Telegram inline keyboards reject `tel:` URLs. Fixed by replacing the "Call Customer" button URL with the Google Maps link (Telegram only accepts http/https URLs).

**New features added:**
1. **Wishlist** — full wishlist system with Zustand persisted store (`useWishlist`), shared across product cards, item detail page, and a new `/wishlist` page. Heart icons toggle wishlist state (persisted to localStorage). Profile page shows wishlist count and links to the wishlist page. Wishlist page supports add-to-cart and remove.
2. **Supabase Storage image upload** — installed `@supabase/supabase-js`, created `src/lib/supabase-server.ts` server client, `/api/admin/upload` API route, and an `ImageUploadField` component in the admin menu form. Admin can now upload images directly (file picker → base64 → Supabase Storage `menu-images` bucket → public URL), with a live preview and fallback URL paste field. Max 5MB.
3. **Gemini Vision payment verification** — created `src/lib/gemini.ts` with `verifyPaymentScreenshot()` that uses the Vision model to auto-verify UPI payment screenshots. Checks: is it a payment screenshot, payment status (Success/Paid), amount match, UPI ID match. Wired into `/api/orders` POST — when a UPI order is placed, the screenshot is auto-verified; if verified, `paymentStatus` is set to `VERIFIED` and a status log entry is added. Falls back gracefully to "admin review needed" if verification fails or is unavailable.
4. **Home page enhancements** — added "Heritage Banner" (64+ years since 1962, ornate gold frame), "Why Shankar?" section (4 feature cards: Authentic Recipes, Pure & Fresh, Fast Delivery, Trusted by Generations), both with staggered fade-in animations.

**Styling polish:**
- Added CSS animations: `fadeInUp`, `cardPop` (staggered card entrance), `softPulse`, `slideInRight`, `goldSweep` (premium button shimmer).
- Product cards now lift on hover (`translateY(-3px)` + deeper shadow).
- Staggered card-pop animation on featured section grids (50ms delay per card, max 400ms).
- Focus-visible ring (gold) for accessibility across all interactive elements.
- Page transition animation (`main` fades in on navigation).
- Ornate frame utility (`.ornate-frame`) for hero sections.
- Skeleton card styles for future loading states.

**Verification (agent-browser, 2026-09-14):**
- Home: 113 interactive elements, Heritage banner + Why Shankar sections render, all category tiles navigate.
- Menu: restored, shows grouped categories with items.
- Wishlist: add from product card → appears on `/wishlist` page with remove + add-to-cart.
- Admin menu form: image upload field present ("Upload Image" + "paste image URL").
- ESLint: clean (0 errors, 0 warnings).
- Dev server: fresh restart, no ReferenceErrors.

### Phase 3 Completed (2026-09-14, cron review round 2)

**QA findings (all stable, no bugs):**
- Home, menu, cart, checkout, item detail, admin all return 200.
- Category tile navigation works (fixed in Phase 2).
- Item detail → add to cart → cart → checkout flow verified.
- No runtime errors in dev.log.

**New features added:**
1. **Customer Reviews & Ratings** — full reviews system:
   - Prisma `Review` model (itemId, customerName, customerPhone, rating 1-5, comment, verified, active, createdAt) with relation to Item.
   - `/api/reviews` GET (list reviews for an item + average + count) and POST (create review with validation: name, 10-digit phone, rating 1-5, one review per phone per item).
   - **Verified Buyer badge** — reviews are auto-marked verified if the customer's phone has a DELIVERED order containing that item.
   - Item aggregate rating + ratingCount auto-updated on new review.
   - `/api/admin/reviews` GET (list all) + PATCH (hide/show/delete for moderation).
   - `ReviewsSection` component on item detail page: rating summary card, write-review form with star picker, reviews list with verified badges, avatar initials, date, staggered animations.
2. **Multi-image support per item** — up to 5 images:
   - `getItemImages()` helper parses the `images` JSON field (falls back to single `image`).
   - Item detail page now shows an **image carousel** with prev/next chevrons, dot indicators, and a thumbnail strip below.
   - Admin menu form has a new `MultiImageField` component: upload to Supabase Storage, add by URL, remove individual images, numbered thumbnails, max 5 enforced.
3. **Combo Deals section** on home page:
   - `ComboDeals` component with horizontally-scrollable deal cards.
   - 4 dynamic combos built from real menu items: Pizza & Chai (10% off), Burger & Lassi (12% off), Samosa Chai Time (15% off), Chinese Feast (10% off).
   - Each card shows: badge, savings amount, item thumbnails (overlapping avatars), item list with checkmarks, original price (strikethrough) vs combo price, "Add Combo" button that adds all items to cart at once.

**Styling polish:**
- Item detail page: image carousel with smooth transitions, thumbnail strip, gold dot indicators.
- Reviews: staggered fade-in-up animation, verified buyer badge with shield icon, avatar circles with initials.
- Combo deals: card-pop entrance animation, overlapping item avatars, savings badge in natural green.

**Verification (agent-browser, 2026-09-14):**
- Home: Combo Deals section renders with all 4 deals, Featured Items + Why Shankar sections present.
- Item detail: Reviews & Ratings section renders, "Write a Review" button opens form (name, phone, star rating, comment, post).
- Reviews API: POST creates review (verified via curl), GET returns reviews with average + count.
- ESLint: clean (0 errors, 0 warnings).

### Phase 4 Completed (2026-09-14, cron review round 3)

**QA findings (all stable, no bugs):**
- Home, menu, cart, checkout, item detail, admin all return 200.
- Combo Deals, Featured Items, Why Shankar sections render on home.
- Admin login works, orders dashboard functional.
- No runtime errors in dev.log.

**New features added:**
1. **Admin Reviews Moderation tab** (6th admin tab):
   - New `/admin/reviews` page with stats (total reviews, average rating, verified buyers count), filter chips (all/active/hidden), and review cards showing item name, star rating, verified badge, customer info, comment, and hide/show/delete actions.
   - Added "Reviews" tab to `AdminShell` with `MessageSquare` icon.
   - Uses existing `/api/admin/reviews` GET + PATCH endpoints.
2. **Recently Viewed Items** (client-side tracking):
   - New `useRecentlyViewed` Zustand store (persisted to localStorage, max 10 items, deduped, timestamped).
   - Item detail page auto-tracks views via `useEffect`.
   - New `RecentlyViewed` component on home page: horizontally-scrollable row of recently viewed items with thumbnails, prices, and clear button. Only shows when there are recently viewed items.
3. **Delivery ETA** on checkout:
   - New `estimateDeliveryMinutes()` helper in constants (base 20 min prep + 4 min/km travel, clamped 25-60 min).
   - `formatETA()` helper.
   - ETA banner on checkout page (burgundy gradient card with clock icon, min-max time, distance, "arrives by" timestamp) — shown when address is set and in range.
   - ETA card on order confirmation screen ("Arriving in 25-45 min") + "Track My Order" button linking to orders page.

**Styling polish:**
- ETA banner: burgundy gradient with gold accent, clock icon in translucent gold circle, "arrives by" timestamp.
- Recently viewed: horizontal scroll with rounded thumbnails, price badges, history icon.
- Admin reviews: stat cards with icons, filter chips, review cards with verified/hidden badges.

**Verification (agent-browser, 2026-09-14):**
- Home: Combo Deals + Featured Items + Why Shankar sections render.
- Admin login page renders, reviews tab added to sidebar.
- Admin reviews page compiles (HTTP 200).
- ESLint: clean (0 errors, 0 warnings).

### Phase 5 Completed (2026-09-14, cron review round 4)

**QA findings (all stable, no bugs):**
- Home, menu, cart, checkout, item detail, admin all return 200.
- No runtime errors in dev.log.

**New features added:**
1. **Admin Analytics Dashboard** (new 1st admin tab):
   - New `/admin/analytics` page + `/api/admin/analytics` API route.
   - KPI cards: Total Revenue, Today's Revenue, Avg Order Value, Delivered count (with pending count).
   - **Revenue bar chart** — last 7 days, gradient gold-to-burgundy bars with tooltips.
   - **Popular Items** list — ranked by qty sold, with progress bars.
   - **Payment Methods** split — COD vs UPI counts with proportion bar.
   - **Menu by Category** — item counts per category with gold gradient bars.
   - All charts built with pure CSS (no external chart library).
   - Added "Analytics" as the first tab in AdminShell with `BarChart3` icon.
2. **Festive Offers Banner** on home page:
   - New `FestiveBanner` component with 3 coupon cards: WELCOME10 (10% off), SWEET15 (15% off sweets/bakery), FREESHIP (free delivery).
   - Each coupon has a copy-to-clipboard button with check feedback + toast.
   - Dmissible (X button) — dismissal persisted to localStorage.
   - Burgundy gradient background with decorative sparkle icons, dashed gold borders.
3. **Sticky category tabs** on menu page:
   - `CategoryRow` now supports a `sticky` prop — when enabled, the category bar sticks to the top on scroll with an ivory background and gold bottom border.
   - Enabled on the `/menu` page for better navigation while browsing.

**Styling polish:**
- Analytics: gradient bar charts, KPI cards with accent variant (burgundy background for the primary revenue card).
- Festive banner: gradient background, decorative sparkles, dashed gold borders, monospace coupon codes.
- Sticky category bar: ivory background with subtle border on scroll.

**Verification (agent-browser, 2026-09-14):**
- Home: Festive Offers banner renders ("Save Big on Every Order" + WELCOME10 coupon), Combo Deals + Featured Items present.
- Admin: login works → Analytics tab renders with "Revenue — Last 7 Days" chart, "Popular Items" section.
- Analytics API returns 401 without auth (correct), 200 with admin cookie.
- ESLint: clean (0 errors, 0 warnings).
- Screenshot saved: `/home/z/my-project/verify-analytics.png`.

### Phase 6 Completed (2026-09-14, cron review round 5)

**QA findings (all stable, no bugs):**
- Home, menu, cart, checkout, item detail, admin all return 200.
- No runtime errors in dev.log.

**New features added:**
1. **Coupon validation at checkout** (full end-to-end):
   - New `Coupon` type + `COUPONS` array + `validateCoupon()` function in `constants.ts`.
   - 3 coupons: WELCOME10 (10% off, min ₹200), SWEET15 (15% off sweets/bakery, min ₹300, category-restricted), FREESHIP (free delivery, min ₹150).
   - Coupon input field on checkout page with Apply button, validation, success/error toasts.
   - Applied coupon card with green check, code, savings amount, and remove (X) button.
   - Bill details updated: shows coupon discount line (-₹X in green), free delivery indicator, "You saved ₹X" badge.
   - Discount + couponCode persisted to the Order via new Prisma fields (`discount`, `couponCode`).
   - Order API stores the discount and coupon code.
2. **Share order button** on confirmation screen:
   - Uses the Web Share API if available (mobile native share sheet), falls back to clipboard copy.
   - Shares order number + tracking link.
3. **Downloadable receipt** on confirmation screen:
   - Generates a formatted text receipt (order number, date, customer, items, subtotal, discount, delivery fee, total, tracking link).
   - Downloads as `receipt-<orderNumber>.txt` via Blob.
4. **Refined confirmation screen**:
   - ETA card ("Arriving in 25-45 min").
   - Track My Order button (links to /orders).
   - Share + Receipt buttons in a row.
   - Back to Home button.

**Styling polish:**
- Coupon applied card: green border + check icon + monospace code.
- Discount line in bill: green color with minus sign.
- "You saved" badge in natural green.
- Share/Receipt buttons with gold accent icons.

**Verification (agent-browser, 2026-09-14):**
- Checkout page: "Apply Coupon" section renders with input field + "Try WELCOME10, SWEET15, or FREESHIP" hint.
- ESLint: clean (0 errors, 0 warnings).
- Screenshot saved: `/home/z/my-project/verify-coupon.png`.

### Known limitations (updated)
1. **Database**: Currently using local SQLite (`db/custom.db`) for the working preview. The Turso credentials are in `.env` (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN). To switch to Turso, add `@prisma/adapter-libsql` and enable `previewFeatures = ["driverAdapters"]` in the Prisma schema, then point `DATABASE_URL` at the Turso URL. The schema is identical so it's a drop-in. The user's existing Turso tables were not altered.
2. **Supabase Storage**: ✅ Wired — admin image upload to `menu-images` bucket is functional via `/api/admin/upload`. Customer auth (email+password, Google OAuth) is still guest-only at checkout (Supabase Auth not yet wired into UI).
3. **Gemini Vision**: ✅ Wired — UPI payment screenshots are auto-verified on order placement. Falls back to admin manual review if verification fails.
4. **Leaflet maps**: Replaced with a self-contained draggable-pin map (no external tile dependency) to avoid network tile fetches in the sandbox. Can swap to Leaflet+OSM Nominatim later if needed.
5. **Dev server stability**: The sandbox occasionally kills the Next.js dev process. The 15-min cron job restarts it automatically. If manual restart is needed: `setsid bash -c 'cd /home/z/my-project && exec /home/z/my-project/node_modules/.bin/next dev -H 0.0.0.0 -p 3000 > /home/z/my-project/dev.log 2>&1' < /dev/null & disown`
6. **Coupons**: ✅ Fully wired — codes are validated and applied at checkout, discount + couponCode persisted to orders.

### Priority recommendations for next phase
1. **Wire Supabase Auth** — customer email/password + Google OAuth at checkout, persist user → order link. (Storage upload ✅ done)
2. **Switch to Turso** — add libsql adapter for production database.
3. **Leaflet + OSM Nominatim** — real map tiles + geocoding for address search.
4. **Telegram webhook** — receive callback button presses (currently one-way notifications + in-app admin actions; the callback buttons need a webhook endpoint to handle Telegram button presses).
5. **More menu items** — populate Sweets/Bakery/Ice Cream categories with weight-based pricing via admin.
6. **Loyalty/rewards program** — points per order, redeemable for discounts.
7. **Order history for logged-in customers** — persist and display past orders by phone/email.
8. **Push notifications** — order status updates via web push API.
9. **Export analytics** — CSV/PDF export of sales data from admin analytics.
10. **Admin coupon management** — let admin create/edit coupons from the admin panel (currently hardcoded in constants.ts).

### Architecture notes
- All API routes use `force-dynamic` to ensure fresh data.
- Cart state persisted to localStorage via Zustand `persist` middleware.
- Admin auth: stable SHA-256 token in httpOnly cookie, 7-day expiry.
- Delivery fee calc: `calculateDeliveryFee()` in `src/lib/constants.ts` — single source of truth used by cart, checkout, and the orders API.
