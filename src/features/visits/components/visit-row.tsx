import { ListRow } from '@/components/list-row';
import { Chip } from '@/components/chip';
import type { Visit } from '@/features/visits/types';
import { formatFullDate } from '@/lib/dates';

const STATUS_LABEL: Record<Visit['status'], string> = {
  upcoming: 'Upcoming',
  completed: 'Done',
  missed: 'Missed',
};

export function VisitRow({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  return (
    <ListRow
      title={visit.title}
      subtitle={`${formatFullDate(visit.date)} · ${visit.time} · ${visit.location}`}
      onPress={onPress}
      right={<Chip label={STATUS_LABEL[visit.status]} selected={visit.status === 'upcoming'} />}
    />
  );
}
