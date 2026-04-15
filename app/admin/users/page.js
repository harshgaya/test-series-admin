import Topbar from '@/components/admin/Topbar'
import UsersClient from './UsersClient'

export default function UsersPage() {
  return (
    <div>
      <Topbar title="Students" subtitle="View and manage student accounts" />
      <div className="p-6">
        <UsersClient />
      </div>
    </div>
  )
}
