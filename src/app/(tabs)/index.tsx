import { useEffect, useMemo, useState } from 'react';
import {
  ActionGrid,
  ActionTile,
  CardList,
  Card,
  GreetingHeader,
  MainScreen,
  SectionHeading,
} from "@/components/main-screen";
import { DashboardHeaderCard } from "@/features/dashboard/components/dashboard-header-card";
import { TodaySummaryCard } from "@/features/dashboard/components/today-summary-card";
import {
  dashboardActions,
  todaySummaryItems,
  todayTasks,
  treatmentSummary,
} from "@/features/dashboard/data/dashboard";
import {
  getNextAppointment,
  subscribeAppointments,
} from '@/features/appointments/data/appointments';
import {
  formatAppointmentShort,
  parseIsoDate,
} from '@/features/appointments/utils/format-appointment-date';

/**
 * Home / Dashboard tab — the day-to-day control centre for the patient's
 * braces journey.  Layout from top to bottom (kept compact on purpose):
 *   1. Friendly greeting header
 *   2. Treatment-progress hero (progress ring + next visit + months)
 *   3. Three "today" glance tiles (next visit, comfort, next bill)
 *   4. Quick-action tiles (log comfort, photo, color, pay)
 *   5. Today's reminders (max 2)
 */
export default function DashboardScreen() {
  const date = "Tuesday, June 16";
  const reminders = todayTasks.slice(0, 2);

  const [nextAppointment, setNextAppointment] = useState(() => getNextAppointment());

  useEffect(() => {
    const unsubscribe = subscribeAppointments(() => {
      setNextAppointment(getNextAppointment());
    });
    return unsubscribe;
  }, []);

  const dynamicSummary = useMemo(() => {
    if (!nextAppointment) {
      return {
        ...treatmentSummary,
        nextAppointment: 'No upcoming visits',
      };
    }
    const nextVisitStr = `${formatAppointmentShort(nextAppointment.date)} · ${nextAppointment.time}`;
    return {
      ...treatmentSummary,
      nextAppointment: nextVisitStr,
    };
  }, [nextAppointment]);

  const dynamicSummaryItems = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return todaySummaryItems.map((item) => {
      if (item.label === 'Next visit') {
        if (nextAppointment) {
          const parsed = parseIsoDate(nextAppointment.date);
          const dateVal = parsed ? `${monthNames[parsed.getMonth()]} ${parsed.getDate()}` : nextAppointment.date;
          return {
            ...item,
            value: dateVal,
            helper: `${nextAppointment.time} ${nextAppointment.title.toLowerCase()}`,
          };
        } else {
          return {
            ...item,
            value: 'None',
            helper: 'No upcoming visits',
          };
        }
      }
      return item;
    });
  }, [nextAppointment]);

  return (
    <MainScreen hideHeader>
      <GreetingHeader name={treatmentSummary.patientName} date={date} />

      <DashboardHeaderCard summary={dynamicSummary} />

      <TodaySummaryCard items={dynamicSummaryItems} />

      <SectionHeading>Quick actions</SectionHeading>
      <ActionGrid>
        {dashboardActions.map((action) => (
          <ActionTile
            key={action.id}
            icon={action.icon}
            title={action.title}
            description={action.description}
            tone={action.tone}
          />
        ))}
      </ActionGrid>

      <SectionHeading>Today’s reminders</SectionHeading>
      <CardList>
        {reminders.map((task) => (
          <Card
            key={task.title}
            title={task.title}
            description={task.description}
            meta={task.icon ?? "•"}
          />
        ))}
      </CardList>
    </MainScreen>
  );
}
