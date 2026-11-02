-- =========================================================
--   四十号邮局 · 数据库脚本
--   河海大学信息科学与工程学院建院四十周年主题网站
--   数据库：Supabase (PostgreSQL)
--
--   用法：Supabase 控制台 → 左侧 SQL Editor → 粘贴全文 → Run
--   这个脚本可以重复执行，第二次跑不会报错、也不会清掉已有信件。
--
--   跑完之后还有两步（见文件末尾 8. 节）：
--     1. 在 Authentication 里建一个管理员账号
--     2. 把那个邮箱插进 admins 表
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
  status       text        not null default 'ok',   -- ok=正常可见，hidden=被管理员下架
  created_at   timestamptz not null default now(),
  constraint letters_content_len check (char_length(content) <= 500),
  constraint letters_parent_fk foreign key (parent_id)
    references public.letters(id) on delete cascade
);

-- 已经建过旧表的库，用这几行补上 status 字段（新库执行也无害）
alter table public.letters add column if not exists status text;
update public.letters set status = 'ok' where status is null;
alter table public.letters alter column status set default 'ok';
alter table public.letters alter column status set not null;
alter table public.letters drop constraint if exists letters_status_check;
alter table public.letters add constraint letters_status_check
  check (status in ('ok', 'hidden'));

-- 常用查询：按信箱取、按时间倒序、按父信件取回复
create index if not exists letters_mailbox_idx   on public.letters (mailbox);
create index if not exists letters_created_idx   on public.letters (created_at desc);
create index if not exists letters_parent_idx    on public.letters (parent_id);
create index if not exists letters_status_idx    on public.letters (status);

comment on table  public.letters is '四十号邮局：校友与师生的来信及回复';
comment on column public.letters.mailbox is '所属信箱，取值见前端 js/config.js 的 PO_MAILBOXES';
comment on column public.letters.parent_id is '为空表示主信件，否则为所回复信件的 id';
comment on column public.letters.status is 'ok=公开展示；hidden=管理员下架，只有管理员能看见';


-- ---------- 2. 管理员名单 ----------
-- 这里是「谁有后台权限」的唯一凭据。
-- 加人：往下面插一行邮箱；撤权：删掉那一行。改完立刻生效，不用重发代码。
create table if not exists public.admins (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- 不开任何策略 = 前端拿 anon key 读不到也写不了，只有数据库里的函数能查


-- ---------- 3. 判断「现在请求我的人是不是管理员」 ----------
-- security definer：以函数拥有者的身份执行，才能读到被 RLS 挡住的 admins 表。
-- 前端拿 anon key 也没法伪造，因为它读的是登录令牌里的邮箱。
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.admins a
     where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;


-- ---------- 4. 开启行级安全（RLS）----------
-- anon key 会随前端代码一起发布出去，任何人都能拿到。
-- 保护数据的唯一手段就是 RLS：不开启的话，等于把数据库裸奔在公网。
alter table public.letters enable row level security;

-- 读：公开只看 status='ok' 的信；管理员能看全部（包括被下架的）
drop policy if exists "letters_select_all"      on public.letters;
drop policy if exists "letters_select_public"   on public.letters;
create policy "letters_select_public"
  on public.letters for select
  using (status = 'ok' or public.is_admin());

-- 写：所有人可以投信（免注册），但只能写成 'ok'，不能自己塞 hidden 或改别人的
drop policy if exists "letters_insert_all"      on public.letters;
drop policy if exists "letters_insert_public"   on public.letters;
create policy "letters_insert_public"
  on public.letters for insert
  with check (status = 'ok' or public.is_admin());

-- 改：只有管理员。点赞不走这里，走下面的 like_letter 函数。
drop policy if exists "letters_no_update"       on public.letters;
create policy "letters_admin_update"
  on public.letters for update
  using (public.is_admin())
  with check (public.is_admin());

-- 删：只有管理员。删主信会连带删掉它下面的回复（外键 on delete cascade）。
drop policy if exists "letters_no_delete"       on public.letters;
create policy "letters_admin_delete"
  on public.letters for delete
  using (public.is_admin());


-- ---------- 5. 点赞函数 ----------
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
     and status = 'ok'
  returning likes;
$$;

grant execute on function public.like_letter(uuid) to anon, authenticated;


-- ---------- 6. 屏蔽词库 ----------
-- 不写在前端 JS 里，是因为改词要重新发版；放这里管理员在后台就能加。
-- 前端启动时拉这张表；拉不到就退回代码里那份兜底词库（离线也能用）。
create table if not exists public.words (
  id         bigserial primary key,
  word       text not null unique,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.words enable row level security;

-- 谁都能读（前端要拿词库来过滤）
drop policy if exists "words_select_public" on public.words;
create policy "words_select_public"
  on public.words for select
  using (true);

-- 只有管理员能加词、删词
drop policy if exists "words_admin_write" on public.words;
create policy "words_admin_write"
  on public.words for all
  using (public.is_admin())
  with check (public.is_admin());

-- 种子词：和前端 js/sensitiveWords.js 里那份保持一致。
-- 已经存在的词会被跳过（on conflict do nothing），重复跑不会报错。
insert into public.words (word, note) values
  -- 辱骂与攻击
  ('傻逼', '辱骂'), ('傻b', '辱骂'), ('煞笔', '辱骂'), ('沙比', '辱骂'),
  ('智障', '辱骂'), ('脑残', '辱骂'), ('废物', '辱骂'), ('滚蛋', '辱骂'),
  ('去死', '辱骂'), ('垃圾人', '辱骂'), ('白痴', '辱骂'), ('low逼', '辱骂'),
  ('狗东西', '辱骂'), ('贱人', '辱骂'), ('你妈', '辱骂'), ('tmd', '辱骂'),
  ('nmsl', '辱骂'), ('cnmb', '辱骂'), ('rnm', '辱骂'),
  -- 广告与引流
  ('加微信', '广告'), ('加v信', '广告'), ('加薇信', '广告'), ('私聊我', '广告'),
  ('代写', '广告'), ('代做', '广告'), ('包过', '广告'), ('低价出', '广告'),
  ('扫码进群', '广告'), ('刷单', '广告'), ('兼职日结', '广告'), ('日入过万', '广告'),
  -- 垃圾信息
  ('推广链接', '垃圾'), ('点击链接', '垃圾'), ('免费领取', '垃圾'),
  ('内部资料出售', '垃圾'), ('加我微信', '垃圾'),
  -- 其他不宜出现在校园页面的内容
  ('约炮', '违规'), ('裸聊', '违规'), ('赌场', '违规'), ('博彩', '违规'),
  ('办证', '违规'), ('发票代开', '违规')
on conflict (word) do nothing;


-- ---------- 6.5 表权限（GRANT）----------
-- 建项目时如果勾了「Automatically expose new tables」，Supabase 会自动授权；
-- 没勾的话，匿名访客连表都碰不到，前端会报 permission denied。
-- 这里显式授权一遍，两种情况都能跑通。真正拦数据的是上面的 RLS，不是这里：
-- 就算给了 anon 删表权限，没有对应 policy 也删不掉一行。
grant select, insert, update, delete on public.letters to anon, authenticated;
grant select on public.words to anon;
grant select, insert, update, delete on public.words to authenticated;
grant usage, select on sequence public.words_id_seq to anon, authenticated;

-- admins 表只有数据库函数（is_admin）能读，前端角色一律收回权限
revoke all on public.admins from anon, authenticated;


-- ---------- 7. 验收：看一眼建好了没 ----------
-- 跑完可以在 SQL Editor 里执行这两句检查：
--   select count(*) from public.letters;   -- 信有多少封
--   select count(*) from public.words;     -- 词库有多少条


-- =========================================================
--   8. 建管理员账号（手动两步，SQL 做不了）
-- =========================================================
--
--   第一步：Supabase 控制台 → Authentication → Users → Add user
--           填邮箱 + 密码，勾上 Auto Confirm User（否则登录会提示邮箱未验证）
--
--   第二步：回到 SQL Editor，把邮箱换成你的，跑一次：
--
--     insert into public.admins (email, note)
--     values ('你的邮箱@example.com', '管理员')
--     on conflict (email) do nothing;
--
--   然后在浏览器打开 admin.html，用这个邮箱密码登录就能管信和词库了。
--
--   注意：Supabase 默认允许任何人自助注册。这个项目不需要，请去
--   Authentication → Providers → Email 里把 "Enable sign ups" 关掉，
--   否则别人注册了也能拿到账号（虽然进不了后台，因为 admins 表里没他，
--   但少一个口子总是好的）。
-- =========================================================
