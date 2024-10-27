CREATE TABLE `session` (
	`id` integer PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_session_id_unique` ON `session` (`session_id`);