import { WeekScheduleView } from '@/components/WeekScheduleView';

export function FormateurSchedulePage() {
  return (
    <WeekScheduleView
      title="Mon emploi du temps"
      description="Vos cours de la semaine — groupe, salle et horaire."
      hide="formateur"
    />
  );
}
