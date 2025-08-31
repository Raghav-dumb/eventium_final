BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "event_enrollment" (
	"enrollment_id"	TEXT,
	"event_id"	TEXT NOT NULL UNIQUE,
	"enrolled_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	"user_id"	TEXT UNIQUE,
	PRIMARY KEY("enrollment_id")
);
CREATE TABLE IF NOT EXISTS "events" (
	"event_id"	TEXT,
	"host_id"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"description"	TEXT,
	"fsq_place_id"	TEXT NOT NULL,
	"venue_name"	TEXT,
	"venue_address"	TEXT NOT NULL,
	"venue_lat"	REAL,
	"venue_lon"	REAL,
	"venue_category"	TEXT,
	"type"	TEXT NOT NULL CHECK(("type" IN ('public', 'private'))),
	"invite_code"	TEXT,
	"date_time"	TEXT NOT NULL,
	"capacity"	INTEGER,
	"created_at"	TEXT DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("event_id")
);
CREATE TABLE IF NOT EXISTS "uploads" (
	"id"	INTEGER,
	"user_id"	INTEGER NOT NULL,
	"filename"	TEXT NOT NULL,
	"file_path"	TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"upload_time"	TEXT,
	"expires_at"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER,
	"username"	TEXT NOT NULL UNIQUE,
	"password_hash"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
COMMIT;
