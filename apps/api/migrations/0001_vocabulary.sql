CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`position` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sections_source_position_idx` ON `sections` (`source_id`,`position`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sources_user_created_idx` ON `sources` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `vocabulary_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` text,
	`section_id` text,
	`word` text NOT NULL,
	`normalized_word` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'learning' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "vocabulary_items_status_check" CHECK("vocabulary_items"."status" in ('learning', 'mastered', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `vocabulary_user_word_idx` ON `vocabulary_items` (`user_id`,`normalized_word`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_source_idx` ON `vocabulary_items` (`user_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `vocabulary_user_section_idx` ON `vocabulary_items` (`user_id`,`section_id`);