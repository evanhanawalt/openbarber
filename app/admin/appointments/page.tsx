import { loadAppointments } from "@/lib/actions";
import { AppointmentsAdmin } from "@/components/admin/appointments-admin";

export default async function AdminAppointmentsPage() {
  const { rows, timezone } = await loadAppointments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-walnut">
          Appointments
        </h1>
        <p className="mt-2 text-muted">
          Confirmed bookings. Cancelling frees capacity on the schedule.
        </p>
      </div>
      <AppointmentsAdmin
        timezone={timezone}
        rows={rows.map(({ appointment, typeName }) => ({
          id: appointment.id,
          clientName: appointment.clientName,
          clientEmail: appointment.clientEmail,
          clientPhone: appointment.clientPhone,
          startsAt: appointment.startsAt.toISOString(),
          endsAt: appointment.endsAt.toISOString(),
          status: appointment.status,
          typeName,
        }))}
      />
    </div>
  );
}
