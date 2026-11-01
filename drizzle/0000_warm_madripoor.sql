CREATE TABLE `missions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
