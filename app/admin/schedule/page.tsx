import { loadScheduleAdminData } from "@/lib/actions";
import { ScheduleAdminForm } from "@/components/admin/schedule-form";

export default async function AdminSchedulePage() {
  const data = await loadScheduleAdminData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-walnut">
          Schedule
        </h1>
        <p className="mt-2 text-muted">
          Control weekly hours, overrides, and how far out clients can request.
        </p>
      </div>
      <ScheduleAdminForm
        settings={data.settings}
        weekly={data.weekly}
        overrides={data.overrides}
        previewDays={data.previewDays}
        appointmentTypeName={data.appointmentType.name}
        appointmentDuration={data.appointmentType.durationMinutes}
      />
    </div>
  );
}
