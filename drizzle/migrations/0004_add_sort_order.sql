ALTER TABLE `filter_lists` ADD COLUMN `position` integer NOT NULL DEFAULT 0;
ALTER TABLE `sites` ADD COLUMN `position` integer NOT NULL DEFAULT 0;
UPDATE `filter_lists` SET `position` = `id`;
UPDATE `sites` SET `position` = `id`;
