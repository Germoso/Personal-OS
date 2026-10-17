ALTER TABLE `tasks` ADD `schedule_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `start_time` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `end_time` text;--> statement-breakpoint
CREATE INDEX `tasks_schedule_date_idx` ON `tasks` (`schedule_date`);