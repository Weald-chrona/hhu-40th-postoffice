-- =========================================================
--   四十号邮局 · 数据库脚本
--   河海大学信息科学与工程学院建院四十周年主题网站
--   数据库：Supabase (PostgreSQL)
--   用法：Supabase 控制台 → 左侧 SQL Editor → 粘贴全文 → Run
-- =========================================================

-- ---------- 1. 信件表 ----------
create table if not exists public.letters (
  id           uuid primary key default gen_random_uuid(),
  mailbox      text        not null,          -- 信箱 id：1986-1995 / 1996-2005 / ... / faculty
  author_name  text        not null,          -- 署名（免注册，可用网名）
  grad_year    smallint,                      -- 入学年份，可空
  content      text        not null,          -- 正文，500 字以内
  parent_id    uuid,                          -- 为空=主信；有值=对某封信的回复
  likes        integer     not null default 0,
  created_at   timestamptz not null default now(),
  constraint letters_content_len check (char_length(content) <= 500),
  constraint letters_parent_fk foreign key (parent_id)
    references public.letters(id) on delete cascade
);

-- 常用查询：按信箱取、按时间倒序、按父信件取回复
create index if not exists letters_mailbox_idx   on public.letters (mailbox);
create index if not exists letters_created_idx   on public.letters (created_at desc);
create index if not exists letters_parent_idx    on public.letters (parent_id);

comment on table  public.letters is '四十号邮局：校友与师生的来信及回复';
comment on column public.letters.mailbox is '所属信箱，取值见前端 js/config.js 的 PO_MAILBOXES';
comment on column public.letters.parent_id is '为空表示主信件，否则为所回复信件的 id';

-- ---------- 2. 开启行级安全（RLS）----------
-- anon key 会随前端代码一起发布出去，任何人都能拿到。
-- 保护数据的唯一手段就是 RLS：不开启的话，等于把数据库裸奔在公网。
alter table public.letters enable row level security;

-- 所有人可以读（留言墙本来就是公开的）
drop policy if exists "letters_select_all" on public.letters;
create policy "letters_select_all"
  on public.letters for select
  using (true);

-- 所有人可以写信（免注册投稿）
drop policy if exists "letters_insert_all" on public.letters;
create policy "letters_insert_all"
  on public.letters for insert
  with check (true);

-- 不允许直接改、删已有信件：点赞只能走下面的 like_letter 函数，
-- 防止有人用 anon key 把 likes 改成任意值、或删掉别人的信。
drop policy if exists "letters_no_update" on public.letters;
create policy "letters_no_update"
  on public.letters for update
  using (false);

drop policy if exists "letters_no_delete" on public.letters;
create policy "letters_no_delete"
  on public.letters for delete
  using (false);

-- ---------- 3. 点赞函数 ----------
-- 前端调用：supabase.rpc('like_letter', { letter_id: '...' })
-- 用函数而不是前端 update，是为了让 +1 在数据库里原子完成，
-- 同时避免拿到 anon key 的人绕过 RLS 直接改数字。
create or replace function public.like_letter(letter_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.letters
     set likes = coalesce(likes, 0) + 1
   where id = letter_id
  returning likes;
$$;

grant execute on function public.like_letter(uuid) to anon, authenticated;

-- ---------- 4. 可选：清理演示数据 ----------
-- 答辩前想把测试留言清掉，跑这一行：
-- delete from public.letters where author_name like '%测试%';

-- ---------- 5. 验收用：插三条示例信 ----------
-- insert into public.letters (mailbox, author_name, grad_year, content) values
--   ('1986-1995', '老无线电人', 1986, '当年实验室里那台示波器，比我们每个人都宝贝。'),
--   ('2016-2025', '2019级小陈', 2019, '在信息楼通宵调代码的夜晚，现在想起来还亮着。'),
--   ('2026-fresh', '2026级新生', 2026, '四年后再来看这封信，希望我没辜负今天的自己。');
