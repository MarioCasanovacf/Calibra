CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text DEFAULT 'Remote' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`published_at` text,
	`expires_at` text,
	`employment_type` text DEFAULT 'Contractor' NOT NULL,
	`salary` text DEFAULT 'Por confirmar' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`technical_score` integer DEFAULT 0 NOT NULL,
	`experience_score` integer DEFAULT 0 NOT NULL,
	`career_score` integer DEFAULT 0 NOT NULL,
	`verdict` text DEFAULT 'Por evaluar' NOT NULL,
	`recommended_cv` text DEFAULT 'SDS' NOT NULL,
	`matched_skills` text DEFAULT '[]' NOT NULL,
	`gaps` text DEFAULT '[]' NOT NULL,
	`evidence` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'Identificada' NOT NULL,
	`next_action` text DEFAULT 'Revisar requisitos' NOT NULL,
	`is_new` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_source_external_idx` ON `jobs` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `jobs_score_idx` ON `jobs` (`score`);--> statement-breakpoint
CREATE INDEX `jobs_status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE TABLE `search_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`scanned` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`duplicates` integer DEFAULT 0 NOT NULL,
	`rejected` integer DEFAULT 0 NOT NULL,
	`error` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
