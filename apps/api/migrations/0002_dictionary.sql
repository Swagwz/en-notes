CREATE TABLE `dictionary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`lookup_term` text NOT NULL,
	`entry_key` text NOT NULL,
	`headword` text NOT NULL,
	`part_of_speech` text,
	`pronunciation` text,
	`audio_filename` text,
	`short_definitions_json` text NOT NULL,
	`entry_json` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dictionary_entries_lookup_position_idx` ON `dictionary_entries` (`provider`,`lookup_term`,`position`);--> statement-breakpoint
CREATE INDEX `dictionary_entries_headword_idx` ON `dictionary_entries` (`headword`);--> statement-breakpoint
CREATE TABLE `dictionary_lookups` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`term` text NOT NULL,
	`response_json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dictionary_lookups_provider_term_idx` ON `dictionary_lookups` (`provider`,`term`);