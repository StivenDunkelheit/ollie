-- Ollie — начальная схема
-- Применить в Supabase → SQL Editor, либо `supabase db push`.

-- ---------------------------------------------------------------- типы

create type lesson_status as enum ('generating', 'ready', 'failed');
create type session_status as enum ('waiting', 'active', 'paused', 'ended');

-- ---------------------------------------------------------------- teachers

create table teachers (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

comment on table teachers is 'Профиль учителя. Ученики аккаунтов не имеют.';

-- Профиль создаётся автоматически при регистрации.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teachers (id, email, name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- lessons

create table lessons (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references teachers (id) on delete cascade,
  title           text not null,
  grade           text not null,
  topic           text,
  theme           text not null default 'auto',
  status          lesson_status not null default 'generating',
  -- Сгенерированный урок. Форма валидируется LessonSchema (zod) в приложении.
  content         jsonb,
  -- Исходный текст задач: нужен, чтобы перегенерировать урок на новом промпте.
  source_text     text not null default '',
  generate_spares boolean not null default false,
  -- Модель, токены, длительность, стоимость одной генерации.
  ai_meta         jsonb,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index lessons_teacher_created_idx on lessons (teacher_id, created_at desc);

create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger lessons_touch_updated_at
  before update on lessons
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------- sessions

create table sessions (
  id               uuid primary key default gen_random_uuid(),
  lesson_id        uuid not null references lessons (id) on delete cascade,
  -- 32 случайных байта в base64url. Он же имя Realtime-канала и единственный
  -- ключ доступа ученика, поэтому в БД лежит с unique-индексом.
  token            text not null unique,
  -- Копия урока на момент старта: правки урока не ломают идущее занятие.
  content_snapshot jsonb not null,
  state            jsonb not null default '{}'::jsonb,
  status           session_status not null default 'waiting',
  student_name     text,
  started_at       timestamptz,
  ended_at         timestamptz,
  expires_at       timestamptz not null default (now() + interval '24 hours'),
  created_at       timestamptz not null default now()
);

create index sessions_lesson_idx on sessions (lesson_id, created_at desc);
create index sessions_status_idx on sessions (status) where status in ('waiting', 'active', 'paused');

-- ---------------------------------------------------------------- attempts

create table attempts (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  block_id   text not null,
  answer     jsonb not null,
  is_correct boolean not null,
  score      real not null default 0,
  created_at timestamptz not null default now()
);

create index attempts_session_block_idx on attempts (session_id, block_id);

-- ---------------------------------------------------------------- RLS
--
-- Ученик под этими политиками не проходит вообще: он анонимен и ходит только
-- в /api/public/*, где сервер использует service-role ключ и сам сверяет
-- токен. Политики «по токену» тут намеренно отсутствуют — иначе anon-ключ
-- позволял бы перебирать токены напрямую через PostgREST.

alter table teachers enable row level security;
alter table lessons  enable row level security;
alter table sessions enable row level security;
alter table attempts enable row level security;

create policy "teacher reads own profile"
  on teachers for select using (id = (select auth.uid()));

create policy "teacher updates own profile"
  on teachers for update using (id = (select auth.uid()));

create policy "teacher manages own lessons"
  on lessons for all
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "teacher manages own sessions"
  on sessions for all
  using (
    exists (
      select 1 from lessons l
      where l.id = sessions.lesson_id
        and l.teacher_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from lessons l
      where l.id = sessions.lesson_id
        and l.teacher_id = (select auth.uid())
    )
  );

-- Попытки учитель только читает; пишет их сервер под service-role после
-- проверки ответа.
create policy "teacher reads own attempts"
  on attempts for select
  using (
    exists (
      select 1
      from sessions s
      join lessons l on l.id = s.lesson_id
      where s.id = attempts.session_id
        and l.teacher_id = (select auth.uid())
    )
  );
