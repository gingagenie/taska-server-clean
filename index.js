// index.js — boring, reliable, secure-by-default API starter

require("dotenv/config");
require("./padlock-db"); // kills process if host/user/sslmode wrong

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

// ----- CORS (optional but recommended when you point the real client) -----
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "";
if (CLIENT_ORIGIN) {
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
}

// ----- DB -----
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ORG_ID = process.env.ORG_ID; // single-tenant scope for now (secure: not from headers)

app.use(express.json());

// ----- basic health -----
app.get("/api/ping", (_req, res) =>
  res.json({ ok: true, message: "pong", ts: new Date().toISOString() })
);

// whoami (verifies we’re taska_app on the right host)
app.get("/api/whoami", async (_req, res) => {
  try {
    const r = await pool.query(`
      select current_user as "user",
             current_database() as db,
             inet_server_addr() as server_ip
    `);
    const urlHost = (() => { try { return new URL(process.env.DATABASE_URL).hostname; } catch { return "unknown"; } })();
    res.json({ ok: true, url_host: urlHost, ...r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ----- REAL DATA: customers in your org -----
// Secure now: we NEVER trust client-supplied org; we always filter by ORG_ID env.
// When you later add auth+RLS, swap this to SET LOCAL app.current_org and drop the WHERE.
app.get("/api/customers", async (req, res) => {
  if (!ORG_ID) return res.status(500).json({ ok: false, error: "ORG_ID is not set on the server" });
  try {
    const { q } = req.query;
    const params = [ORG_ID];
    let sql = `
      select id, name
      from public.customers
      where org_id = $1
    `;
    if (q) {
      params.push(`%${q}%`);
      sql += ` and name ilike $2 `;
    }
    sql += ` order by name asc limit 100 `;
    const r = await pool.query(sql, params);
    res.json({ ok: true, count: r.rowCount, customers: r.rows });
  } catch (e) {
    // handle common issues nicely
    const msg = String(e?.message || e);
    if (/relation .* does not exist/i.test(msg)) {
      return res.status(500).json({
        ok: false,
        error: "Table 'public.customers' not found. Confirm your schema/table names."
      });
    }
    if (/permission denied/i.test(msg)) {
      return res.status(500).json({
        ok: false,
        error: "Permission denied for taska_app. Grant SELECT on public.customers."
      });
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

// ----- (Optional) quick DB health -----
app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ ok: true, result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- start -----
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
