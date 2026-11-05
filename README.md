# Hood Boyz Collection

Streetwear shop for Hood Boyz. Prices are stored in Ghana cedis. Paystack amounts are charged in pesewas. The browser never decides a total, and an order stays unpaid until Paystack verifies it or a staff member confirms pay on delivery.

## Local shop

Node 22 is expected. From this folder:

```bash
npm run db:setup
npm run dev
```

`db:setup` starts a local Postgres on port 54351, applies `supabase/migrations`, and seeds the six supplied garments, demonstration stock, shipping methods, and the HOOD10 coupon. The first super admin is created from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` in `.env.local`. The password is written to `.local/admin-credentials.txt` and is not printed here.

Copy `.env.example` if you want to set those values before the first setup.

## What is connected

- Shop, bag, wishlist, checkout, account, and admin read this database.
- Without `PAYSTACK_SECRET_KEY`, card and mobile money are unavailable. Pay on delivery creates a pending order. There is no button that marks a card payment successful.
- Without `NEXT_PUBLIC_SUPABASE_URL`, accounts use the local `profiles` table and uploads go to `public/uploads`. Point `DATABASE_URL` at the same Supabase project before using its Auth or Storage.
- Sample prices and demonstration stock stay labeled until you turn those flags off in Admin → Settings.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deploy

Use the same SQL migrations on the production database. Set `SESSION_SECRET`, the admin seed values, `NEXT_PUBLIC_APP_URL`, and Paystack keys in the host environment. The Paystack webhook is `POST /api/payments/paystack`.
