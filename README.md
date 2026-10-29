# EA Hosting Hub

A session desk for choosing symbols, starting a watch, and clearing the list.

The home screen carries the EA Hosting Hub mark, a **Powered by EA Hosting Hub** line, and three controls: **Remove**, **Start**, and **Symbols**.

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Pick markets from **Symbols**, press **Start** to run the session, and **Remove** to clear them. The choice of symbols and the remove confirmation are kept in this browser.

## SwagStack Studio

Website customizer SaaS lives alongside the desk:

- App: `/studio`
- Published sites: `/s/:slug`
- Setup + env docs: [`docs/SWAGSTACK.md`](docs/SWAGSTACK.md)
- DB migration: [`supabase/swagstack_schema.sql`](supabase/swagstack_schema.sql)

```bash
npm test
```
