require("dotenv/config");
require("./padlock-db"); // validate DB target & params

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || undefined;

if (CLIENT_ORIGIN) app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Health + smoke
app.get("/api/ping", (_req, res) =>
  res.json({ ok: true, message: "pong", ts: new Date().toISOString() })
);

app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ ok: true, result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
