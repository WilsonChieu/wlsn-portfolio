import type { Metadata } from "next";
import AdminToaster from "@/components/admin/AdminToaster";

export const metadata: Metadata = {
  title: "Admin — WLSN",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper px-6 py-10 text-ink md:px-12">
      {children}
      <AdminToaster />
    </div>
  );
}
