CREATE TABLE IF NOT EXISTS "filter_lists" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "slug" text NOT NULL UNIQUE
);

INSERT INTO "filter_lists" ("id", "slug") VALUES (1, 'default');

ALTER TABLE "dns_records" ADD COLUMN "list_id" integer DEFAULT NULL REFERENCES filter_lists(id);
