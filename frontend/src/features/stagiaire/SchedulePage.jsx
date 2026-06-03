import { WeekScheduleView } from '@/components/WeekScheduleView';

export function StagiaireSchedulePage() {
  return (
    <WeekScheduleView
      title="Mon emploi du temps"
      description="Les cours de votre groupe pour la semaine."
      hide="groupe"
    />
  );
}
