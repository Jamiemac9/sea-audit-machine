CREATE TABLE `document_images` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`page_number` integer,
	`sha256` text NOT NULL,
	`d_hash` text,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_images_doc_idx` ON `document_images` (`document_id`);--> statement-breakpoint
CREATE INDEX `document_images_dhash_idx` ON `document_images` (`d_hash`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`resident_file_id` text,
	`original_name` text NOT NULL,
	`stored_path` text NOT NULL,
	`sha256` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`wr_code` text,
	`document_date` integer,
	`confidence` real,
	`classified_by` text,
	`extraction_state` text DEFAULT 'PENDING' NOT NULL,
	`extraction_error` text,
	`extracted_text` text,
	`page_count` integer,
	`doc_created_at` integer,
	`doc_modified_at` integer,
	`last_modified_by` text,
	`needs_ocr` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resident_file_id`) REFERENCES `resident_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_round_sha_idx` ON `documents` (`round_id`,`sha256`);--> statement-breakpoint
CREATE INDEX `documents_resident_idx` ON `documents` (`resident_file_id`);--> statement-breakpoint
CREATE INDEX `documents_wr_idx` ON `documents` (`wr_code`);--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`resident_file_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`stream` text NOT NULL,
	`severity` text NOT NULL,
	`document_ref` text NOT NULL,
	`what_is_wrong` text NOT NULL,
	`what_good_looks_like` text,
	`evidence_json` text,
	`status` text DEFAULT 'PROPOSED' NOT NULL,
	`dismiss_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`resident_file_id`) REFERENCES `resident_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `findings_unique_idx` ON `findings` (`resident_file_id`,`rule_id`,`document_ref`);--> statement-breakpoint
CREATE INDEX `findings_resident_idx` ON `findings` (`resident_file_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`resident_file_id` text NOT NULL,
	`source_document_id` text,
	`title` text NOT NULL,
	`has_action_plan` integer DEFAULT false NOT NULL,
	`action_plan_text` text,
	`target_date` integer,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`resident_file_id`) REFERENCES `resident_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goals_resident_idx` ON `goals` (`resident_file_id`);--> statement-breakpoint
CREATE TABLE `managing_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contract` text,
	`region` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managing_agents_name_unique` ON `managing_agents` (`name`);--> statement-breakpoint
CREATE TABLE `resident_files` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`resident_name` text NOT NULL,
	`aliases` text,
	`property_line1` text,
	`room_ref` text,
	`move_in_date` integer,
	`move_out_date` integer,
	`rating` text,
	`rating_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resident_files_round_idx` ON `resident_files` (`round_id`);--> statement-breakpoint
CREATE TABLE `risks` (
	`id` text PRIMARY KEY NOT NULL,
	`resident_file_id` text NOT NULL,
	`source_document_id` text,
	`name` text NOT NULL,
	`likelihood` integer,
	`severity` integer,
	`score` integer,
	`has_plan` integer DEFAULT false NOT NULL,
	`plan_text` text,
	`reviewed_3m` integer DEFAULT false NOT NULL,
	`reviewed_6m` integer DEFAULT false NOT NULL,
	`reviewed_9m` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`resident_file_id`) REFERENCES `resident_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `risks_resident_idx` ON `risks` (`resident_file_id`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`managing_agent_id` text NOT NULL,
	`label` text NOT NULL,
	`audit_date` integer,
	`feedback_issued` integer,
	`format` text DEFAULT 'FIRST_AUDIT' NOT NULL,
	`previous_round_id` text,
	`status` text DEFAULT 'INTAKE' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`managing_agent_id`) REFERENCES `managing_agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rounds_agent_idx` ON `rounds` (`managing_agent_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`resident_file_id` text NOT NULL,
	`source_document_id` text,
	`session_date` integer,
	`duration_mins` integer,
	`attended` integer DEFAULT true NOT NULL,
	`missed_reason` text,
	`warning_issued` integer DEFAULT false NOT NULL,
	`resident_signed` integer DEFAULT false NOT NULL,
	`worker_signed` integer DEFAULT false NOT NULL,
	`is_room_check` integer DEFAULT false NOT NULL,
	`evidence_noted` integer DEFAULT false NOT NULL,
	`body_text` text,
	FOREIGN KEY (`resident_file_id`) REFERENCES `resident_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_resident_idx` ON `sessions` (`resident_file_id`);