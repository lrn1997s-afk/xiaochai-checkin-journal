-- 小柴打卡手帐 · 账号系统数据表
-- 拿到 Postgres 数据库之后，把这份文件的内容整个复制粘贴到数据库的 SQL 编辑器里执行一次即可。
-- 如果之前已经执行过一次旧版本（没有 group_memberships 表），再执行一次这份新的也没问题，
-- 前三张表用了 if not exists，不会重复建、不会清空已有数据。

create table if not exists users (
  id serial primary key,
  username varchar(20) unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token varchar(64) primary key,
  user_id integer not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists user_states (
  user_id integer primary key references users(id) on delete cascade,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

-- 新增：记录每个用户加入了哪些群组，用来支持"群组排行榜/成员列表"这类查询
create table if not exists group_memberships (
  user_id integer not null references users(id) on delete cascade,
  group_id text not null,
  joined_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);
create index if not exists group_memberships_group_id_idx on group_memberships(group_id);
