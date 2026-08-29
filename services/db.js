import mysql from "mysql2/promise";

let db;

export const initDB = async () => {
  db = mysql.createPool({
    host:              process.env.DB_HOST,
    user:              process.env.DB_USER,
    password:          process.env.DB_PASS,
    database:          process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:   10,           // max 10 simultaneous connections
    queueLimit:        0,            // unlimited queue
    connectTimeout:    10000,        // 10s connection timeout
    // Enable SSL in production if DB_SSL=true
    ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {})
  });

  // Verify connectivity on startup
  const conn = await db.getConnection();
  await conn.ping();
  conn.release();

  console.log(`[${new Date().toISOString()}] ✅ DB Connected (pool size: 10)`);
};

export { db };