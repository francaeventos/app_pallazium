/**
 * Cria/atualiza admin local para desenvolvimento.
 * Uso: node scripts/ensure-local-admin.mjs
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const email = process.env.LOCAL_ADMIN_EMAIL || "admin@local.test";
const password = process.env.LOCAL_ADMIN_PASSWORD || "admin123";
const fullName = process.env.LOCAL_ADMIN_NAME || "Admin Local";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
  const passwordHash = await bcrypt.hash(password, 12);

  let userId;
  if (existing.rowCount > 0) {
    userId = existing.rows[0].id;
    await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      passwordHash,
      userId,
    ]);
    await client.query(
      `UPDATE profiles SET full_name = $1, email = $2, updated_at = NOW() WHERE id = $3`,
      [fullName, email, userId],
    );
  } else {
    const created = await client.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id`,
      [email, passwordHash],
    );
    userId = created.rows[0].id;
    await client.query(
      `INSERT INTO profiles (id, full_name, email, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [userId, fullName, email],
    );  }

  await client.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1, 'admin'::app_role)
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId],
  );

  await client.query("COMMIT");
  console.log("OK admin local:");
  console.log(`  email: ${email}`);
  console.log(`  senha: ${password}`);
  console.log(`  id:    ${userId}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
