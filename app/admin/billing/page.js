import BillingDashboard from "@/components/admin/billing/bllingDashboard";
import Topbar from "@/components/admin/Topbar";

export default function BillingPage() {
  return (
    <div>
      <Topbar
        title="Billing"
        subtitle="Track API usage, student activity and manage payments"
      />
      <div className="p-6">
        <BillingDashboard />
      </div>
    </div>
  );
}
