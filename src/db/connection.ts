import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "demo_emptum",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 3000, // 3 segundos de timeout para rápida comutação pro fallback
  queueLimit: 0,
});

export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexão com o banco de dados MySQL realizada com sucesso!");
    connection.release();
    return true;
  } catch (error: any) {
    console.warn("⚠️ MySQL remoto indisponível diretamente:", error.message);
    return false;
  }
}
