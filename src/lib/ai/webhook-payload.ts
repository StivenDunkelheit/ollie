import { z } from 'zod';
import { LessonSchema } from '@/lib/schema/lesson';
import { STORY_THEMES } from '@/lib/themes';
import { INTERACTIVE_TYPES } from '@/lib/interactives';
import { quizDef } from '@/lib/interactives/quiz';
import { multipleChoiceDef } from '@/lib/interactives/multiple-choice';
import { fillBlankDef } from '@/lib/interactives/fill-blank';
import { matchDef } from '@/lib/interactives/match';
import { sortDef } from '@/lib/interactives/sort';
import { dragDropDef } from '@/lib/interactives/drag-drop';

/**
 * Контракт со сценарием генерации (Make.com).
 *
 * Приложение не знает, какая модель стоит за вебхуком, и не хранит промпт —
 * оно отправляет задание и правила, а обратно принимает урок и проверяет его
 * своей же схемой. Поэтому правила и JSON Schema едут в payload: сценарий
 * всегда получает актуальную версию, а не копию, которая разъедется.
 */

export interface GenerationInput {
  title: string;
  grade: string;
  topic: string | null;
  /** Слаг темы, либо 'auto' — обрати сам, либо 'none' — без сюжету. */
  theme: string;
  generateSpares: boolean;
  sourceText: string;
}

const DEFS = [quizDef, multipleChoiceDef, fillBlankDef, matchDef, sortDef, dragDropDef];

/** Правила, которые сценарий должен передать модели. Здесь — источник истины. */
function rules(input: GenerationInput) {
  return {
    selection: [
      'Проаналізуй усі задачі з тексту.',
      'Визнач складність кожної.',
      'Прибери дублікати й дуже схожі задачі — залиш найкращу з групи.',
      'Оціни навчальну цінність: задача, яка нічого не перевіряє, до уроку не потрапляє.',
      'Візьми оптимальну кількість, а не всі. Якщо для якісного уроку достатньо 10 із 40 — візьми 10.',
    ],
    difficulty: [
      'Головне правило: урок іде від легкого до складного.',
      'Кожному завданню постав поле difficulty від 1 (найлегше) до 5 (найважче).',
      'Уздовж уроку difficulty не може спадати: наступне завдання таке саме або складніше.',
      'Урок не може складатися лише з легких або лише зі складних задач — має бути наростання.',
      'Перше завдання — найлегше з відібраних, останнє — найважче.',
      'Ці правила перевіряються автоматично: урок із порушеною кривою буде відхилено.',
    ],
    variety: [
      'Не став підряд два однакових типи інтерактиву — чергуй механіки.',
      'Підбирай інтерактив під тип задачі, а не навпаки.',
      'Якщо задача не лягає в жоден компонент — пропусти її, не викривляй.',
    ],
    structure: [
      'Типовий порядок: intro → story → task → task → reward → task → boss → final_quiz → stats → finish.',
      'intro рівно один і перший; stats передостанній; finish рівно один і останній.',
      'reward — після 2–4 завдань, не частіше.',
      'boss — коли матеріалу вистачає щонайменше на 3 раунди; hp має дорівнювати кількості раундів.',
      'final_quiz — 3–10 швидких питань.',
      'story — лише якщо урок із сюжетом.',
    ],
    timer: [
      'Таймер — не налаштування уроку, а твоє рішення для конкретного блоку.',
      'Став його там, де поспіх доречний: раунди боса, швидке повторення, проста вправа наприкінці.',
      'У задачах на міркування timer_sec має бути null.',
    ],
    story: [
      input.theme === 'none'
        ? 'Урок без сюжету: theme = "none", story = null, блоків story немає.'
        : input.theme === 'auto'
          ? 'Обери тему оформлення сам — під вік учня і предмет. Для старших класів доречніші стримані теми.'
          : `Використай тему оформлення "${input.theme}".`,
      'Якщо сюжет є — він наскрізний: зав’язка в story.intro, вставки між завданнями, розв’язка в story.outro.',
      'Персонаж звертається до учня на «ти».',
    ],
    spares: input.generateSpares
      ? [
          'Вартісні задачі, які не увійшли до основної лінії, познач як запасні: is_bonus = true.',
          'Запасні не входять у криву складності — їх викладач видає поза чергою.',
        ]
      : ['Запасних завдань не створюй: жодного блоку з is_bonus = true.'],
    content: [
      'Не вигадуй задач, яких немає в тексті. Ти відбираєш і оформлюєш, а не створюєш зміст.',
      'Не змінюй числа й умови задач.',
      'Якщо в тексті є правильні відповіді — бери їх звідти, не перераховуй самостійно.',
      'Якщо відповіді немає і впевнено визначити її не можеш — не бери цю задачу в урок.',
      'Неправильні варіанти мають відповідати типовим помилкам, а не бути абсурдними.',
      'Ідентифікатори (id) — короткі, латиницею, унікальні в межах уроку.',
      'Мова уроку — українська, якщо в самих задачах явно не використана інша.',
    ],
  };
}

export interface GenerationWebhookPayload {
  event: 'lesson.generate';
  version: number;
  lesson_id: string;
  requested_at: string;
  callback: { url: string; token: string };
  input: {
    title: string;
    grade: string;
    topic: string | null;
    theme: string;
    generate_spares: boolean;
    source_text: string;
  };
  rules: ReturnType<typeof rules>;
  reference: {
    themes: { slug: string; label: string }[];
    interactives: { type: string; description: string }[];
    block_kinds: string[];
  };
  output_schema: unknown;
}

type JsonObject = Record<string, unknown>;

/**
 * Приводит схему к виду, который принимают structured outputs.
 *
 * zod выдаёт `oneOf` для discriminated union, но и OpenAI, и Anthropic ждут
 * `anyOf` — для непересекающихся вариантов это одно и то же. Заодно
 * проставляем `additionalProperties: false`: строгий режим без него не
 * включается, а лишние поля в уроке нам не нужны в любом случае.
 */
function forStructuredOutput(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(forStructuredOutput);
  if (node === null || typeof node !== 'object') return node;

  const source = node as JsonObject;
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(source)) {
    result[key === 'oneOf' ? 'anyOf' : key] = forStructuredOutput(value);
  }

  if (result.type === 'object' && result.properties && result.additionalProperties === undefined) {
    result.additionalProperties = false;
  }

  return result;
}

export function buildGenerationPayload(args: {
  lessonId: string;
  callbackUrl: string;
  callbackToken: string;
  input: GenerationInput;
}): GenerationWebhookPayload {
  return {
    event: 'lesson.generate',
    version: 1,
    lesson_id: args.lessonId,
    requested_at: new Date().toISOString(),
    callback: { url: args.callbackUrl, token: args.callbackToken },
    input: {
      title: args.input.title,
      grade: args.input.grade,
      topic: args.input.topic,
      theme: args.input.theme,
      generate_spares: args.input.generateSpares,
      source_text: args.input.sourceText,
    },
    rules: rules(args.input),
    reference: {
      themes: STORY_THEMES.map((t) => ({ slug: t.slug, label: t.label })),
      interactives: DEFS.map((def) => ({ type: def.type, description: def.aiDescription })),
      block_kinds: ['intro', 'story', 'task', 'reward', 'boss', 'final_quiz', 'stats', 'finish'],
    },
    // Схема едет вместе с заданием: сценарий подставляет её как structured
    // output, и урок физически не может прийти неправильной формы.
    output_schema: forStructuredOutput(z.toJSONSchema(LessonSchema, { io: 'input' })),
  };
}

/** Список типов интерактивов — для документации и тестов. */
export const SUPPORTED_INTERACTIVES = INTERACTIVE_TYPES;
