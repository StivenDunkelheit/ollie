import { z } from 'zod';
import type { Quiz } from '@/lib/schema/lesson';
import { CORRECT, WRONG, type InteractiveDef } from './types';

export const QuizInputSchema = z.object({ option_id: z.string() });
export type QuizInput = z.infer<typeof QuizInputSchema>;

export interface PublicQuiz {
  type: 'quiz';
  question: string;
  options: { id: string; text: string }[];
}

export const quizDef: InteractiveDef<Quiz, QuizInput, PublicQuiz> = {
  type: 'quiz',

  inputSchema: QuizInputSchema,

  check(interactive, input) {
    return input.option_id === interactive.correct_id ? CORRECT : WRONG;
  },

  sanitize(interactive) {
    return {
      type: 'quiz',
      question: interactive.question,
      options: interactive.options.map((o) => ({ id: o.id, text: o.text })),
    };
  },

  aiDescription:
    'quiz — питання з кількома варіантами, правильний лише один. ' +
    'Підходить для перевірки означень, вибору формули, швидкої перевірки розуміння. ' +
    '2–6 варіантів; неправильні мають бути правдоподібними, а не абсурдними.',
};
