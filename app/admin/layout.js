import { Suspense } from "react";
import Sidebar from "@/components/admin/Sidebar";

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-7 h-7 border-2 border-gray-200 rounded-full animate-spin"
        style={{ borderTopColor: "#0D9488" }}
      />
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
    </div>
  );
}
