CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`team` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_match_idx` ON `events` (`match_id`);--> statement-breakpoint
CREATE TABLE `map_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`gx` integer NOT NULL,
	`gy` integer NOT NULL,
	`team` integer NOT NULL,
	`splat_density` real DEFAULT 0.4 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `map_nodes_match_idx` ON `map_nodes` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `map_nodes_cell_idx` ON `map_nodes` (`match_id`,`gx`,`gy`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`hotspot_ssid` text DEFAULT 'AR-STRIKE-LAN' NOT NULL,
	`host_ip` text DEFAULT '192.168.43.1' NOT NULL,
	`splat_scene` text DEFAULT 'warehouse' NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`arena_size` integer DEFAULT 60 NOT NULL,
	`max_teams` integer DEFAULT 4 NOT NULL,
	`max_per_team` integer DEFAULT 5 NOT NULL,
	`score_limit` integer DEFAULT 30 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`started_at` integer,
	`ended_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_code_idx` ON `matches` (`code`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`device_id` text NOT NULL,
	`callsign` text NOT NULL,
	`team` integer DEFAULT 1 NOT NULL,
	`is_host` integer DEFAULT false NOT NULL,
	`ready` integer DEFAULT false NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`ammo` integer DEFAULT 30 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`alive` integer DEFAULT true NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`heading` real DEFAULT 0 NOT NULL,
	`respawn_at` integer,
	`last_seen` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`joined_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `players_match_idx` ON `players` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `players_match_device_idx` ON `players` (`match_id`,`device_id`);