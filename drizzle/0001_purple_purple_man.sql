CREATE TABLE `game` (
	`id` integer PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE no action
);
