-- =========================================================
--   四十号邮局 · 答辩演示用示例信
--
--   用法：Supabase 控制台 → SQL Editor → 粘贴全文 → Run
--   这个脚本可以重复执行：已经插过的会跳过（按 author_name + mailbox 判重）。
--
--   六封信，六个信箱各一封。
--   署名统一【演示】，正文就是「信箱名 + 演示」。
--   演示完想清掉，跑最后那一句 delete 就行。
-- =========================================================

insert into public.letters (mailbox, author_name, grad_year, content, created_at, status)
select v.mailbox, v.author_name, v.grad_year, v.content, v.created_at, 'ok'
  from (values
    ('1986-1995',  '【演示】', 1988, '一九八六 — 一九九五 · 演示', now() - interval '6 days'),
    ('1996-2005',  '【演示】', 2001, '一九九六 — 二〇〇五 · 演示', now() - interval '5 days'),
    ('2006-2015',  '【演示】', 2010, '二〇〇六 — 二〇一五 · 演示', now() - interval '4 days'),
    ('2016-2025',  '【演示】', 2019, '二〇一六 — 二〇二五 · 演示', now() - interval '3 days'),
    ('2026-fresh', '【演示】', 2026, '二〇二六 · 新生 · 演示',     now() - interval '2 days'),
    ('faculty',    '【演示】', null, '教职工信箱 · 演示',           now() - interval '1 day')
  ) as v(mailbox, author_name, grad_year, content, created_at)
 where not exists (
   select 1 from public.letters l
    where l.author_name = v.author_name
      and l.mailbox = v.mailbox
 );


-- 看一眼插进去的结果：应该是 6 行，六个信箱各一封
select mailbox, author_name, grad_year, content, created_at
  from public.letters
 where author_name = '【演示】'
 order by created_at;


-- ---------------------------------------------------------
-- 演示结束后清掉（连同别人对这些信的点赞/回复一起删）
-- delete from public.letters where author_name = '【演示】';
-- ---------------------------------------------------------
