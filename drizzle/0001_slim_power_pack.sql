CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol_version` text NOT NULL,
	`file_name` text DEFAULT 'Lote pegado' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`duplicates` integer DEFAULT 0 NOT NULL,
	`invalid` integer DEFAULT 0 NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agent_runs_created_idx` ON `agent_runs` (`created_at`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `human_decision` text DEFAULT 'Pendiente' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `human_reason` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `human_note` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `human_score` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `feedback_at` text;