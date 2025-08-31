BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"username"	TEXT NOT NULL UNIQUE,
	"email"	TEXT NOT NULL UNIQUE,
	"password"	TEXT NOT NULL,
	"created_at"	TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "events" (
	"event_id"	TEXT PRIMARY KEY,
	"host_id"	INTEGER NOT NULL,
	"title"	TEXT NOT NULL,
	"description"	TEXT,
	"fsq_place_id"	TEXT NOT NULL,
	"venue_name"	TEXT,
	"venue_address"	TEXT,
	"venue_lat"	REAL,
	"venue_lon"	REAL,
	"venue_category"	TEXT,
	"event_category"	TEXT,
	"type"	TEXT NOT NULL CHECK ("type" IN ('public','private')),
	"date_time"	TEXT NOT NULL,
	"capacity"	INTEGER,
	"invite_code"	TEXT,
	"created_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("host_id") REFERENCES users("id")
);

CREATE TABLE IF NOT EXISTS "event_enrollments" (
	"enrollment_id"	TEXT PRIMARY KEY,
	"event_id"	TEXT NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"enrolled_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	UNIQUE("event_id","user_id"),
	FOREIGN KEY ("event_id") REFERENCES events("event_id"),
	FOREIGN KEY ("user_id") REFERENCES users("id")
);

COMMIT;
