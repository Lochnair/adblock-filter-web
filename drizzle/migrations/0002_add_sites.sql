CREATE TABLE `sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL
);
CREATE UNIQUE INDEX `sites_slug_unique` ON `sites` (`slug`);

CREATE TABLE `site_lists` (
	`site_id` integer NOT NULL REFERENCES `sites`(`id`),
	`list_id` integer NOT NULL REFERENCES `filter_lists`(`id`),
	PRIMARY KEY(`site_id`, `list_id`)
);
