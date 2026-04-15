import Topbar from '@/components/admin/Topbar'
import RevenueClient from './RevenueClient'

export default function RevenuePage() {
  return (
    <div>
      <Topbar title="Revenue" subtitle="All payments and revenue overview" />
      <div className="p-6">
        <RevenueClient />
      </div>
    </div>
  )
}
