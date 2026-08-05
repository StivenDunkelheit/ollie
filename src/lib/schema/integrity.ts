import type { Block, Interactive, Lesson } from './lesson';

/**
 * Проверки согласованности, которые нельзя выразить в JSON Schema:
 * ссылки внутри интерактива должны сходиться.
 *
 * Structured outputs гарантирует форму, но не то, что `correct_id` есть среди
 * `options`. Битая ссылка означает задание, которое невозможно решить, поэтому
 * такой урок мы не сохраняем, а просим сгенерировать заново.
 */

const PLACEHOLDER = /\{\{\s*([^}\s]+)\s*\}\}/g;

function checkInteractive(interactive: Interactive, where: string, issues: string[]): void {
  switch (interactive.type) {
    case 'quiz': {
      const ids = new Set(interactive.options.map((o) => o.id));
      if (!ids.has(interactive.correct_id)) {
        issues.push(`${where}: correct_id "${interactive.correct_id}" відсутній серед options`);
      }
      break;
    }

    case 'multiple_choice': {
      const ids = new Set(interactive.options.map((o) => o.id));
      for (const correctId of interactive.correct_ids) {
        if (!ids.has(correctId)) {
          issues.push(`${where}: correct_ids містить "${correctId}", якого немає серед options`);
        }
      }
      if (interactive.correct_ids.length >= interactive.options.length) {
        issues.push(`${where}: правильні всі варіанти — завдання не має сенсу`);
      }
      break;
    }

    case 'fill_blank': {
      const declared = new Set(interactive.blanks.map((b) => b.id));
      const used = new Set<string>();
      for (const match of interactive.text.matchAll(PLACEHOLDER)) used.add(match[1]);

      for (const blankId of declared) {
        if (!used.has(blankId)) issues.push(`${where}: пропуск "${blankId}" не згаданий у тексті`);
      }
      for (const blankId of used) {
        if (!declared.has(blankId)) {
          issues.push(`${where}: у тексті є {{${blankId}}}, але його немає в blanks`);
        }
      }
      break;
    }

    case 'match': {
      const left = new Set(interactive.left.map((o) => o.id));
      const right = new Set(interactive.right.map((o) => o.id));
      const pairedLeft = new Set<string>();

      for (const pair of interactive.pairs) {
        if (!left.has(pair.left_id)) issues.push(`${where}: пара посилається на left "${pair.left_id}"`);
        if (!right.has(pair.right_id)) {
          issues.push(`${where}: пара посилається на right "${pair.right_id}"`);
        }
        if (pairedLeft.has(pair.left_id)) {
          issues.push(`${where}: елемент "${pair.left_id}" має більше однієї пари`);
        }
        pairedLeft.add(pair.left_id);
      }

      for (const leftId of left) {
        if (!pairedLeft.has(leftId)) issues.push(`${where}: для "${leftId}" немає пари`);
      }
      break;
    }

    case 'sort': {
      const items = interactive.items.map((o) => o.id);
      const order = interactive.correct_order;

      if (order.length !== items.length) {
        issues.push(`${where}: correct_order містить ${order.length} із ${items.length} елементів`);
      }
      const seen = new Set<string>();
      for (const itemId of order) {
        if (!items.includes(itemId)) issues.push(`${where}: correct_order містить чужий "${itemId}"`);
        if (seen.has(itemId)) issues.push(`${where}: "${itemId}" у correct_order двічі`);
        seen.add(itemId);
      }
      break;
    }

    case 'drag_drop': {
      const items = new Set(interactive.items.map((o) => o.id));
      const zones = new Set(interactive.zones.map((o) => o.id));
      const placed = new Set<string>();

      for (const entry of interactive.placement) {
        if (!items.has(entry.item_id)) {
          issues.push(`${where}: placement посилається на item "${entry.item_id}"`);
        }
        if (!zones.has(entry.zone_id)) {
          issues.push(`${where}: placement посилається на zone "${entry.zone_id}"`);
        }
        if (placed.has(entry.item_id)) {
          issues.push(`${where}: "${entry.item_id}" розміщено у двох зонах`);
        }
        placed.add(entry.item_id);
      }

      for (const itemId of items) {
        if (!placed.has(itemId)) issues.push(`${where}: для "${itemId}" не вказана зона`);
      }
      break;
    }
  }
}

function checkBlock(block: Block, issues: string[]): void {
  switch (block.kind) {
    case 'task':
      checkInteractive(block.interactive, `блок ${block.id}`, issues);
      break;
    case 'boss':
      if (block.hp !== block.rounds.length) {
        issues.push(`блок ${block.id}: hp=${block.hp}, а раундів ${block.rounds.length}`);
      }
      block.rounds.forEach((round, index) => {
        checkInteractive(round as Interactive, `блок ${block.id}, раунд ${index + 1}`, issues);
      });
      break;
    case 'final_quiz':
      block.questions.forEach((question, index) => {
        checkInteractive(question as Interactive, `блок ${block.id}, питання ${index + 1}`, issues);
      });
      break;
    default:
      break;
  }
}

/**
 * Урок должен идти от простого к сложному.
 *
 * Требование викладача: не «только лёгкие» и не «только сложные», а именно
 * нарастание. Проверяем, а не полагаемся на то, что модель послушалась:
 * сложность не должна падать, и к концу урок обязан стать труднее начала.
 *
 * Запасные задания в кривую не входят — их выдают вне очереди.
 */
function checkDifficultyCurve(lesson: Lesson, issues: string[]): void {
  const tasks = lesson.blocks.filter((block) => block.kind === 'task' && !block.is_bonus);
  if (tasks.length === 0) return;

  const curve = tasks.map((task) => ({
    id: task.id,
    difficulty: task.kind === 'task' ? task.difficulty : 0,
  }));

  for (let i = 1; i < curve.length; i += 1) {
    if (curve[i].difficulty < curve[i - 1].difficulty) {
      issues.push(
        `складність падає: блок ${curve[i].id} (${curve[i].difficulty}) легший за попередній ` +
          `${curve[i - 1].id} (${curve[i - 1].difficulty})`,
      );
    }
  }

  // Урок из трёх и более заданий одного уровня — это не «від легкого до складного».
  if (curve.length >= 3 && curve.at(-1)!.difficulty <= curve[0].difficulty) {
    issues.push(
      `урок не ускладнюється: перше завдання має складність ${curve[0].difficulty}, ` +
        `останнє — ${curve.at(-1)!.difficulty}`,
    );
  }
}

export function findIntegrityIssues(lesson: Lesson): string[] {
  const issues: string[] = [];

  const blockIds = new Set<string>();
  for (const block of lesson.blocks) {
    if (blockIds.has(block.id)) issues.push(`id блоку "${block.id}" повторюється`);
    blockIds.add(block.id);
    checkBlock(block, issues);
  }

  if (lesson.theme === 'none') {
    if (lesson.story) issues.push('theme=none, але story заповнений');
    if (lesson.blocks.some((b) => b.kind === 'story')) {
      issues.push('theme=none, але в уроці є блоки story');
    }
  } else if (!lesson.story) {
    issues.push(`theme=${lesson.theme}, але story порожній`);
  }

  if (!lesson.blocks.some((b) => b.kind === 'task')) {
    issues.push('в уроці немає жодного завдання');
  }

  checkDifficultyCurve(lesson, issues);

  return issues;
}
