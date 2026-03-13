alter table project_statuses
add column if not exists lane_version int not null default 0;
