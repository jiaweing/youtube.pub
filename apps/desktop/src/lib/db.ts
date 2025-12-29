import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  console.log("[DB] Initializing shared database...");
  const database = await Database.load("sqlite:gallery.db");
  console.log("[DB] Database connection established");

  // Enable WAL mode for better concurrency and performance
  await database.execute("PRAGMA journal_mode=WAL;");
  await database.execute("PRAGMA synchronous=NORMAL;"); // Faster, still safe in WAL mode

  // Create tables sequentially to avoid locking issues
  console.log("[DB] Verifying schemas...");

  // Gallery table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT 0,
      canvasWidth INTEGER,
      canvasHeight INTEGER
    )
  `);

  // Trash table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS trash (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      deletedAt INTEGER NOT NULL,
      originalCreatedAt INTEGER NOT NULL,
      originalUpdatedAt INTEGER NOT NULL,
      canvasWidth INTEGER,
      canvasHeight INTEGER
    )
  `);

  console.log("[DB] Tables verified");
  return database;
}

export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }
  if (!dbInitPromise) {
    dbInitPromise = initDb();
  }
  db = await dbInitPromise;
  return db;
}
