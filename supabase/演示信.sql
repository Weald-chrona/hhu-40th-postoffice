-- =========================================================
--   四十号邮局 · 答辩演示用示例信
--
--   用法：Supabase 控制台 → SQL Editor → 粘贴全文 → Run
--   这个脚本可以重复执行：已经插过的会跳过（靠 author_name + content 判断）。
--
--   六封信，六个信箱各一封，署名统一是【演示】。
--   演示完想清掉，跑最后那一句 delete 就行。
-- =========================================================

insert into public.letters (mailbox, author_name, grad_year, content, created_at, status)
select v.mailbox, v.author_name, v.grad_year, v.content, v.created_at, 'ok'
  from (values
    ('1986-1995', '【演示】', 1988,
     '1988 年进的学院，那会儿还在常州。做实验要排队进老机房，机器是别的系退下来的，开机得等半天。条件是真差，但那时候没人觉得这算什么。',
     now() - interval '6 days'),

    ('1996-2005', '【演示】', 2001,
     '2001 年毕业。宿舍十一点熄灯，之后就抱着书去机房门口等空位，一个通宵能跑完一次程序。现在学院的机房随便进，挺羡慕的。',
     now() - interval '5 days'),

    ('2006-2015', '【演示】', 2010,
     '2010 级。第一次进实验室是焊一块板子，手抖得厉害，焊点像一坨。现在自己做硬件，手上比当年稳多了，还是那间实验室给的底子。',
     now() - interval '4 days'),

    ('2016-2025', '【演示】', 2019,
     '2019 年入学，在江宁。四年读下来最熟的是实验室三楼靠窗那个位置，下午有太阳，电烙铁的松香味和阳光一个方向。祝学院四十岁生日快乐。',
     now() - interval '3 days'),

    ('2026-fresh', '【演示】', 2026,
     '2026 级新生，来了两个多月，还在认楼。希望四年之后回头看，能有一件自己真正做成的事。',
     now() - interval '2 days'),

    ('faculty', '【演示】', null,
     '在学院教书二十六年。学生换了一届又一届，实验室的灯总是最后熄的那一盏。今年四十岁，还在招人，还在等人。',
     now() - interval '1 day')
  ) as v(mailbox, author_name, grad_year, content, created_at)
 where not exists (
   select 1 from public.letters l
    where l.author_name = v.author_name
      and l.mailbox = v.mailbox
 );


-- 看一眼插进去的结果：应该是 6 行，六个信箱各一封
select mailbox, author_name, grad_year, left(content, 20) as 开头, created_at
  from public.letters
 where author_name = '【演示】'
 order by created_at;


-- ---------------------------------------------------------
-- 演示结束后清掉（连同别人对这些信的点赞/回复一起删）
-- delete from public.letters where author_name = '【演示】';
-- ---------------------------------------------------------
