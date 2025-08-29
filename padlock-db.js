const REQUIRED_HOST = "ep-shy-hill-a7icgvux-pooler.ap-southeast-2.aws.neon.tech";
const REQUIRED_USER = "taska_app";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

let host = "", user = "";
try {
  const u = new URL(url);
  host = u.hostname;
  user = decodeURIComponent(u.username);
} catch (e) {
  console.error("❌ Invalid DATABASE_URL:", e.message);
  process.exit(1);
}

// kill conflicting PG_* envs that could bypass the URL
for (const k of ["PGHOST","PGPORT","PGUSER","PGPASSWORD","PGDATABASE"]) delete process.env[k];

if (host !== REQUIRED_HOST) {
  console.error(`❌ Wrong DB host. Expected ${REQUIRED_HOST} but got ${host}`);
  process.exit(1);
}
if (user !== REQUIRED_USER) {
  console.error(`❌ Wrong DB user. Expected ${REQUIRED_USER} but got ${user}`);
  process.exit(1);
}
for (const token of ["sslmode=require", "channel_binding=require"]) {
  if (!url.includes(token)) {
    console.error(`❌ DATABASE_URL must include "${token}"`);
    process.exit(1);
  }
}
console.log("🔒 DB padlock: host/user/params OK");
