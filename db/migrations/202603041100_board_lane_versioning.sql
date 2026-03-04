-- Add per-lane optimistic concurrency versioning for board ordering.
-- Date: 2026-03-04

alter table project_statuses
add column if not exists lane_version int not null default 0;
