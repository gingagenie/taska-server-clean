const required = ["DATABASE_URL"];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error("❌ Missing required env vars:", missing.join(", "));
  process.exit(1);
}
console.log("✅ Env OK");
