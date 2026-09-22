import { notFound } from "next/navigation";
import Link from "next/link";
import { loadRequestDetail } from "@/lib/actions";
import { RequestDetailClient } from "@/components/admin/request-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await loadRequestDetail(id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/requests" className="text-sm text-muted hover:text-walnut">
        ← All requests
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-walnut">
          Request
        </h1>
        <p className="mt-2 text-muted">
          Client contact for follow-up.
        </p>
      </div>
      <RequestDetailClient request={data.request} />
    </div>
  );
}
