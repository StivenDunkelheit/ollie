-- Генерация уроков вынесена во внешний сценарий (Make.com).
--
-- Приложение отправляет задание на вебхук и отвечает пользователю сразу;
-- сценарий присылает готовый урок обратно на callback. Токен — одноразовый
-- пропуск для этого callback: без него принять чужой урок невозможно.

alter table lessons
  add column generation_token text,
  add column generation_started_at timestamptz;

comment on column lessons.generation_token is
  'Одноразовий токен для callback від сценарію генерації. Очищається після прийому результату.';

-- Ищем урок по токену при приёме результата.
create index lessons_generation_token_idx on lessons (generation_token)
  where generation_token is not null;
