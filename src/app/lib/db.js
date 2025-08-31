import sqlite3 from "sqlite3";
import path from "path";

// Database file stored at project root
const dbPath = path.join(process.cwd(), "app.db");

let db;

// Initialize DB
export function getDB() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Failed to connect to DB:", err.message);
      } else {
        console.log("Connected to SQLite DB at", dbPath);
      }
    });

    // Ensure schema always exists and aligned with API routes
    db.serialize(() => {
      // Users: unique username, unique email, hashed password
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );

      // Events: event_id as public identifier, host_id references users(id)
      db.run(
        `CREATE TABLE IF NOT EXISTS events (
          event_id TEXT PRIMARY KEY,
          host_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          fsq_place_id TEXT NOT NULL,
          venue_name TEXT,
          venue_address TEXT,
          venue_lat REAL,
          venue_lon REAL,
          venue_category TEXT,
          event_category TEXT,
          type TEXT NOT NULL CHECK (type IN ('public','private')),
          date_time TEXT NOT NULL,
          capacity INTEGER,
          invite_code TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (host_id) REFERENCES users(id)
        )`
      );

      // Ensure fsq_place_id exists for older DBs (migrate from fsq_id if present)
      db.all("PRAGMA table_info(events)", [], (err, rows) => {
        if (!err && Array.isArray(rows)) {
          const columnNames = new Set(rows.map((c) => c.name));
          const plannedAdds = [
            { name: 'fsq_place_id', sql: 'ALTER TABLE events ADD COLUMN fsq_place_id TEXT' },
            { name: 'venue_name', sql: 'ALTER TABLE events ADD COLUMN venue_name TEXT' },
            { name: 'venue_address', sql: 'ALTER TABLE events ADD COLUMN venue_address TEXT' },
            { name: 'venue_lat', sql: 'ALTER TABLE events ADD COLUMN venue_lat REAL' },
            { name: 'venue_lon', sql: 'ALTER TABLE events ADD COLUMN venue_lon REAL' },
            { name: 'venue_category', sql: 'ALTER TABLE events ADD COLUMN venue_category TEXT' },
            { name: 'event_category', sql: 'ALTER TABLE events ADD COLUMN event_category TEXT' },
            { name: 'capacity', sql: 'ALTER TABLE events ADD COLUMN capacity INTEGER' },
            { name: 'invite_code', sql: 'ALTER TABLE events ADD COLUMN invite_code TEXT' },
          ];

          plannedAdds.forEach(({ name, sql }) => {
            if (!columnNames.has(name)) {
              db.run(sql, (alterErr) => {
                if (alterErr) {
                  console.warn(`Failed to add ${name} column to events:`, alterErr.message);
                } else {
                                      console.log(`Added missing ${name} column to events table`);
                }
              });
            }
          });

          // Migrate data from legacy fsq_id -> fsq_place_id if needed
          if (columnNames.has('fsq_id') && columnNames.has('fsq_place_id')) {
            db.run("UPDATE events SET fsq_place_id = COALESCE(fsq_place_id, fsq_id) WHERE fsq_place_id IS NULL AND fsq_id IS NOT NULL", (mErr) => {
              if (mErr) {
                                  console.warn("Failed to migrate fsq_id to fsq_place_id:", mErr.message);
              } else {
                console.log("Migrated legacy fsq_id values into fsq_place_id where missing");
              }
            });
          }
        }
      });

      // Event enrollments: composite uniqueness on (event_id, user_id)
      db.run(
        `CREATE TABLE IF NOT EXISTS event_enrollments (
          enrollment_id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id),
          FOREIGN KEY (event_id) REFERENCES events(event_id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      );

      console.log("Tables ensured (users, events, event_enrollments)");
    });
  }
  return db;
}

// --- Helpers with Promise wrappers ---
export function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}
