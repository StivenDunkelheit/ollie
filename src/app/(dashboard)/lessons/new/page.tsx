import { NewLessonForm } from './new-lesson-form';

export default function NewLessonPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-ink-900 text-xl font-semibold tracking-tight">Створити урок</h1>
      <p className="text-ink-500 mt-1 text-sm">
        Вставте задачі текстом. AI сам відбере найкращі, визначить складність, збудує
        послідовність і підбере інтерактиви.
      </p>

      <div className="mt-6">
        <NewLessonForm />
      </div>
    </div>
  );
}
