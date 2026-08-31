create table playlists (
  id            text primary key,
  title         text not null,
  channel       text,
  thumbnail_url text,
  video_count   int  default 0,
  date_added    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz
);

create table videos (
  video_id         text not null,
  playlist_id      text not null references playlists(id) on delete cascade,
  title            text not null,
  thumbnail_url    text,
  duration_seconds int,
  position         int,
  primary key (playlist_id, video_id)
);

create table progress (
  video_id         text primary key,
  playlist_id      text references playlists(id) on delete cascade,
  position_seconds int  default 0,
  duration_seconds int,
  completed        boolean default false,
  updated_at       timestamptz default now()
);

create table heartbeat (
  id         int primary key default 1,
  pinged_at  timestamptz default now()
);

alter table playlists enable row level security;
alter table videos    enable row level security;
alter table progress  enable row level security;
alter table heartbeat enable row level security;

create index idx_progress_playlist on progress(playlist_id);
create index idx_videos_playlist on videos(playlist_id, position);
