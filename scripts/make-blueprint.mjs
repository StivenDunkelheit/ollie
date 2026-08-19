/**
 * Генератор blueprint для Make.com.
 *
 *   npm run make:blueprint
 *
 * Собирается скриптом, а не пишется руками: все промпты уходят через
 * JSON.stringify, поэтому кавычки и переводы строк экранируются гарантированно.
 * Ручная правка такого файла — верный способ получить битый импорт.
 *
 * Правила урока в промпты не зашиты: они подставляются из вебхука
 * ({{2.rules.*}}), то есть меняются в коде приложения без правок сценария.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const HOOK_ID = Number(process.argv[2] ?? 4297706);
const MODEL = process.argv[3] ?? 'claude-haiku-4-5';
const OUT = 'docs/make/ollie-generation.blueprint.json';

// Идентификаторы модулей. На них ссылаются мэппинги, менять нельзя.
const WEBHOOK = 2;
const RESPOND = 3;
const ANALYSE = 4;
const PLAN = 5;
const BUILD = 6;
const CALLBACK = 7;

const analysisText = `${ANALYSE}.data.content[1].text`;
const planText = `${PLAN}.data.content[1].text`;
const lessonText = `${BUILD}.data.content[1].text`;

// ---------------------------------------------------------------- промпты

const ANALYSE_SYSTEM = `Ти аналізуєш сирий список задач, який дав репетитор. Нічого не відбираєш і не будуєш — лише розбираєш.

Для КОЖНОЇ задачі з тексту визнач:
- n — порядковий номер у тексті
- text — умова дослівно, не змінюй жодного числа
- difficulty — складність від 1 (найлегша) до 5 (найважча), відносно рівня класу
- skill — коротка назва навички, яку задача перевіряє
- duplicate_of — номер задачі, дублікатом або дуже схожою на яку вона є, інакше null
- value — навчальна цінність: high, medium або low. Задача, що нічого не перевіряє або повторює вже наявну, має low
- answer — правильна відповідь, якщо вона є в тексті або однозначно обчислюється, інакше null

Оцінюй складність відносно одна одної, а не абсолютно: серед задач мають бути і найлегші, і найважчі.

Заборонено: вигадувати задачі, змінювати умови, здогадуватися про відповідь без упевненості.

ФОРМАТ ВІДПОВІДІ
Один рядок. Записи розділені ` ;; `, поля всередині запису — ` | `.
Заборонено використовувати символ подвійних лапок і переноси рядків. Якщо в умові є лапки — заміни їх на « ».
Порожнє значення позначай дефісом.

Приклад:
n=1 | text=Обчисліть 3/4 + 1/4 | difficulty=1 | skill=додавання дробів | duplicate_of=- | value=high | answer=1 ;; n=2 | text=Порівняйте 2/3 і 5/6 | difficulty=2 | skill=порівняння дробів | duplicate_of=- | value=high | answer=5/6

Нічого, крім цього рядка.`;

const PLAN_SYSTEM = `Ти складаєш план уроку з уже проаналізованих задач. Повних текстів завдань не пишеш — лише вирішуєш, що і в якому порядку буде.

ВІДБІР
{{${WEBHOOK}.escaped.rules.selection}}

СКЛАДНІСТЬ — НАЙВАЖЛИВІШЕ
{{${WEBHOOK}.escaped.rules.difficulty}}

РІЗНОМАНІТНІСТЬ
{{${WEBHOOK}.escaped.rules.variety}}

СТРУКТУРА
{{${WEBHOOK}.escaped.rules.structure}}

ТАЙМЕР
{{${WEBHOOK}.escaped.rules.timer}}

СЮЖЕТ І ОФОРМЛЕННЯ
{{${WEBHOOK}.escaped.rules.story}}

ЗАПАСНІ ЗАВДАННЯ
{{${WEBHOOK}.escaped.rules.spares}}

ДОСТУПНІ ІНТЕРАКТИВИ
{{${WEBHOOK}.escaped.interactives}}

ДОСТУПНІ ТЕМИ ОФОРМЛЕННЯ
{{${WEBHOOK}.escaped.themes}}

Перед відповіддю перевір себе:
1. difficulty у блоках task не спадає зліва направо.
2. Останнє завдання складніше за перше.
3. Два однакових інтерактиви не стоять підряд.
Якщо якась умова порушена — перебудуй план, а не виправдовуйся.

ФОРМАТ ВІДПОВІДІ
Один рядок. Записи розділені ` ;; `, поля всередині запису — ` | `.
Заборонено використовувати символ подвійних лапок і переноси рядків. Якщо потрібні лапки — став « ».
Порожнє значення позначай дефісом.

Спершу один запис із темою і сюжетом, далі — по запису на кожен блок у порядку проходження:
theme=jungle | character=Мавпа Чі | intro=текст зав'язки | outro=текст розв'язки ;; block=intro ;; block=story | note=коротка вставка ;; block=task | task_n=2 | interactive=quiz | difficulty=1 | timer=- | bonus=no ;; block=reward ;; block=task | task_n=5 | interactive=match | difficulty=3 | timer=- | bonus=no ;; block=boss | rounds=3 | timer=45 ;; block=final_quiz | questions=3 ;; block=stats ;; block=finish

Якщо урок без сюжету: theme=none | character=- | intro=- | outro=- і жодного block=story.

Нічого, крім цього рядка.`;

const BUILD_SYSTEM = `Ти оформлюєш готовий план уроку у фінальний JSON за схемою.

Рішення вже ухвалені: набір задач, їх порядок, типи інтерактивів, difficulty, тема оформлення. Не змінюй нічого з цього. Твоя робота — розгорнути план у повні блоки.

Умови задач бери дослівно з аналізу. Правильні відповіді — звідти ж.

ВИМОГИ ДО ЗМІСТУ
{{${WEBHOOK}.escaped.rules.content}}

ТЕХНІЧНІ ВИМОГИ
- id короткі, латиницею, унікальні в межах усього уроку
- у fill_blank пропуски позначай у тексті подвійними фігурними дужками з id; кожен має запис у blanks з усіма прийнятними варіантами відповіді, включно з різними формами запису числа
- у boss поле hp дорівнює кількості раундів
- у sort масив items подавай у перемішаному порядку, правильний — у correct_order
- кожен блок kind=task обовʼязково має поле difficulty з плану

Поверни ЛИШЕ JSON за схемою, без markdown і без пояснень.`;

// ---------------------------------------------------------------- модули

/**
 * Тело запроса к Anthropic.
 *
 * Всё тело проходит через JSON.stringify. Это безопасно ровно потому, что
 * ни одна подстановка Make здесь не содержит кавычек — см. комментарий к
 * промежуточному формату выше.
 */
function anthropicBody({ system, user, maxTokens, schemaRef }) {
  const format = schemaRef
    ? `\n  "output_config": { "format": { "type": "json_schema", "schema": {{${schemaRef}}} } },`
    : '';

  return `{
  "model": "${MODEL}",
  "max_tokens": ${maxTokens},${format}
  "system": ${JSON.stringify(system)},
  "messages": [{ "role": "user", "content": ${JSON.stringify(user)} }]
}`;
}

function httpModule({ id, name, x, url, body, timeout, handleErrors = true }) {
  return {
    id,
    module: 'http:ActionSendData',
    version: 3,
    parameters: { handleErrors, useNewZLibDeCompress: true },
    mapper: {
      url,
      serializeUrl: false,
      method: 'post',
      headers: url.includes('api.anthropic.com')
        ? [
            { name: 'x-api-key', value: 'ВСТАВТЕ_СВІЙ_ANTHROPIC_API_KEY' },
            { name: 'anthropic-version', value: '2023-06-01' },
          ]
        : [],
      qs: [],
      bodyType: 'raw',
      parseResponse: true,
      authUser: '',
      authPass: '',
      timeout: String(timeout),
      shareCookies: false,
      ca: '',
      rejectUnauthorized: true,
      followRedirect: true,
      useQuerystring: false,
      gzip: true,
      useMtls: false,
      contentType: 'application/json',
      data: body,
      followAllRedirects: false,
    },
    metadata: {
      designer: { x, y: 0, name },
      restore: {
        parameters: { handleErrors: { mode: 'chose' } },
        expect: {
          method: { mode: 'chose', label: 'POST' },
          headers: { mode: 'chose' },
          qs: { mode: 'chose' },
          bodyType: { label: 'Raw' },
          contentType: { label: 'JSON (application/json)' },
        },
      },
    },
  };
}

const blueprint = {
  name: 'Ollie — генерація уроку',
  flow: [
    {
      id: WEBHOOK,
      module: 'gateway:CustomWebHook',
      version: 1,
      parameters: { hook: HOOK_ID, maxResults: 1 },
      mapper: {},
      metadata: {
        designer: { x: 0, y: 0, name: 'Завдання від Ollie' },
        restore: {
          parameters: { hook: { data: { editable: 'true' }, label: 'My OLLIO DATA' } },
        },
        parameters: [
          { name: 'hook', type: 'hook:gateway-webhook', label: 'Webhook', required: true },
          { name: 'maxResults', type: 'number', label: 'Maximum number of results' },
        ],
      },
    },
    {
      id: RESPOND,
      module: 'gateway:WebhookRespond',
      version: 1,
      parameters: {},
      mapper: { status: '200', body: '{"accepted":true}', headers: [] },
      metadata: {
        designer: { x: 300, y: 0, name: 'Прийняв завдання' },
        restore: { expect: { headers: { mode: 'chose' } } },
        expect: [
          { name: 'status', type: 'text', label: 'Status', required: true },
          { name: 'body', type: 'any', label: 'Body' },
          {
            name: 'headers',
            type: 'array',
            label: 'Custom headers',
            spec: [
              { name: 'key', type: 'text', label: 'Key' },
              { name: 'value', type: 'text', label: 'Value' },
            ],
          },
        ],
      },
    },
    httpModule({
      id: ANALYSE,
      name: '1. Аналіз задач',
      x: 600,
      url: 'https://api.anthropic.com/v1/messages',
      timeout: 300,
      body: anthropicBody({
        system: ANALYSE_SYSTEM,
        user: `Клас: {{${WEBHOOK}.escaped.grade}}\nТема: {{${WEBHOOK}.escaped.topic}}\n\nЗадачі:\n{{${WEBHOOK}.escaped.source_text}}`,
        maxTokens: 8000,
      }),
    }),
    httpModule({
      id: PLAN,
      name: '2. План уроку',
      x: 900,
      url: 'https://api.anthropic.com/v1/messages',
      timeout: 300,
      body: anthropicBody({
        system: PLAN_SYSTEM,
        user: `Назва уроку: {{${WEBHOOK}.escaped.title}}\nКлас: {{${WEBHOOK}.escaped.grade}}\nТема: {{${WEBHOOK}.escaped.topic}}\nОформлення: {{${WEBHOOK}.input.theme}}\nЗапасні завдання: {{${WEBHOOK}.input.generate_spares}}\n\nПроаналізовані задачі:\n` + `{{${ANALYSE}.data.content[1].text}}`,
        maxTokens: 8000,
      }),
    }),
    httpModule({
      id: BUILD,
      name: '3. Побудова уроку',
      x: 1200,
      url: 'https://api.anthropic.com/v1/messages',
      timeout: 600,
      body: anthropicBody({
        system: BUILD_SYSTEM,
        user: `ПЛАН УРОКУ:\n{{${planText}}}\n\nПРОАНАЛІЗОВАНІ ЗАДАЧІ:\n{{${analysisText}}}`,
        maxTokens: 16000,
        schemaRef: `${WEBHOOK}.output_schema`,
      }),
    }),
    httpModule({
      id: CALLBACK,
      name: '4. Віддати урок Ollie',
      x: 1500,
      url: `{{${WEBHOOK}.callback.url}}`,
      timeout: 120,
      handleErrors: false,
      // lesson подставляется без кавычек — там уже готовый JSON от модели.
      body: `{
  "lesson_id": "{{${WEBHOOK}.lesson_id}}",
  "token": "{{${WEBHOOK}.callback.token}}",
  "status": "ok",
  "lesson": {{${lessonText}}},
  "meta": {
    "model": "${MODEL}",
    "stages": 3,
    "input_tokens": {{${ANALYSE}.data.usage.input_tokens + ${PLAN}.data.usage.input_tokens + ${BUILD}.data.usage.input_tokens}},
    "output_tokens": {{${ANALYSE}.data.usage.output_tokens + ${PLAN}.data.usage.output_tokens + ${BUILD}.data.usage.output_tokens}}
  }
}`,
    }),
  ],
  metadata: {
    instant: true,
    version: 1,
    scenario: {
      roundtrips: 1,
      maxErrors: 3,
      autoCommit: true,
      autoCommitTriggerLast: true,
      sequential: false,
      slots: null,
      confidential: false,
      dataloss: false,
      dlq: false,
      freshVariables: false,
    },
    designer: { orphans: [] },
    zone: 'eu2.make.com',
    notes: [],
  },
};

/**
 * Самопроверка: тело каждого запроса должно остаться валидным JSON после того,
 * как Make подставит значения.
 *
 * Ловит главную ошибку этого файла — выражение с кавычками, попавшее внутрь
 * JSON-строки без обработки. Без такой проверки поломка вылезла бы только на
 * живом запросе, и виновата была бы «модель».
 */
/**
 * Возвращает подстановки `{{…}}`, стоящие внутри строкового литерала JSON.
 *
 * Именно они опасны: значение с переводом строки или кавычкой разрывает тело
 * запроса. Подстановки на месте значения (например `"lesson": {{…}}`) безопасны
 * — туда приходит готовый JSON.
 */
function mappingsInsideStrings(body) {
  const found = [];
  let inString = false;

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];

    if (inString && char === '\\') {
      i += 1; // экранированный символ пропускаем целиком
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString && char === '{' && body[i + 1] === '{') {
      const end = body.indexOf('}}', i);
      if (end === -1) break;
      found.push(body.slice(i, end + 2));
      i = end + 1;
    }
  }

  return found;
}

function checkBodies(flow) {
  const problems = [];

  /**
   * Внутри строкового литерала безопасны только те подстановки, где значение
   * гарантированно однострочное и без кавычек: экранированные приложением
   * поля, идентификаторы и ответы предыдущих шагов (их формат задан промптом).
   */
  const SAFE_INSIDE_STRING =
    /^\{\{\d+\.(escaped\.[\w.]+|lesson_id|callback\.token|input\.(theme|generate_spares)|data\.content\[1\]\.text)\}\}$/;

  for (const module of flow.filter((m) => m.module === 'http:ActionSendData')) {
    const body = module.mapper.data;
    const where = `модуль ${module.id} (${module.metadata.designer.name})`;

    // Выражение, прошедшее через JSON.stringify, получает экранированные
    // кавычки. Тело при этом остаётся валидным JSON, поэтому разбором такое
    // не поймать, — а парсер выражений Make на нём падает.
    for (const [expression] of body.matchAll(/\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}/g)) {
      if (expression.includes('\\"')) {
        problems.push(`${where}: у виразі екрановані лапки — ${expression.slice(0, 70)}…`);
      }
    }

    // Подстановка с переводом строки внутри строкового литерала разорвёт тело.
    // Ищем не шаблоном, а разбором: надо знать, внутри строки мы или нет.
    for (const expression of mappingsInsideStrings(body)) {
      if (!SAFE_INSIDE_STRING.test(expression)) {
        problems.push(`${where}: підстановка всередині рядка не екранована — ${expression}`);
      }
    }

    const filled = body
      .replace(/:\s*\{\{[^{}]*\.(output_schema|text)\}\}/g, ': {}')
      .replace(/:\s*\{\{[^{}]*tokens[^{}]*\}\}/g, ': 0')
      .replace(/\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}/g, 'X');

    try {
      JSON.parse(filled);
    } catch (error) {
      problems.push(`${where}: тіло не є валідним JSON — ${error.message}`);
    }
  }

  return problems;
}

const problems = checkBodies(blueprint.flow);
if (problems.length > 0) {
  console.error('Тіла запитів не проходять перевірку:');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

mkdirSync('docs/make', { recursive: true });
writeFileSync(OUT, JSON.stringify(blueprint, null, 4) + '\n', 'utf8');

console.log(`${OUT}`);
console.log(`  модель: ${MODEL}`);
console.log(`  hook:   ${HOOK_ID}`);
console.log(`  модулів: ${blueprint.flow.length}`);
