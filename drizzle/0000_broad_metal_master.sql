CREATE TABLE `game` (
	`id` integer PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`creator_id` integer NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_participant` (
	`game_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`joined_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	PRIMARY KEY(`game_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ticker_idx` ON `game` (`ticker`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `game` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_session_id_unique` ON `session` (`session_id`);