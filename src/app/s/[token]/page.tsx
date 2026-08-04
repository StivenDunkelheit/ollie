import { loadSessionByToken, toPublicView } from '@/lib/public-session';
import { StudentSession } from './student-session';
import { LinkProblem } from './link-problem';

export const dynamic = 'force-dynamic';

/**
 * Student Mode. Единственный экран ученика: ни кабинета, ни авторизации,
 * доступ даёт только токен в адресе.
 */
export default async function StudentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = await loadSessionByToken(token);

  if (!lookup.ok) {
    return (
      <LinkProblem
        title={lookup.reason === 'expired' ? 'Посилання більше не діє' : 'Посилання не знайдено'}
        text={
          lookup.reason === 'expired'
            ? 'Термін дії цього посилання минув. Попроси викладача надіслати нове.'
            : 'Перевір, чи правильно скопійоване посилання, або попроси викладача надіслати його ще раз.'
        }
      />
    );
  }

  return <StudentSession token={token} initial={toPublicView(lookup.session)} />;
}
