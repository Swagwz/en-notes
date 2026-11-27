CREATE TABLE `wordlist_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`wordlist_id` text NOT NULL,
	`word` text NOT NULL,
	`normalized_word` text NOT NULL,
	`part_of_speech` text,
	`level` integer,
	`position` integer NOT NULL,
	FOREIGN KEY (`wordlist_id`) REFERENCES `wordlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wordlist_entries_list_position_idx` ON `wordlist_entries` (`wordlist_id`,`position`);--> statement-breakpoint
CREATE INDEX `wordlist_entries_list_level_idx` ON `wordlist_entries` (`wordlist_id`,`level`,`position`);--> statement-breakpoint
CREATE TABLE `wordlist_progress` (
	`user_id` text NOT NULL,
	`entry_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `entry_id`),
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `wordlist_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wordlist_progress_status_check" CHECK("wordlist_progress"."status" in ('learning', 'mastered', 'ignored'))
);
--> statement-breakpoint
CREATE INDEX `wordlist_progress_user_status_idx` ON `wordlist_progress` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `wordlists` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wordlists_slug_unique` ON `wordlists` (`slug`);