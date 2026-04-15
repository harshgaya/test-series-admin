import Topbar from '@/components/admin/Topbar'
import FeedbackClient from './FeedbackClient'

export default function FeedbackPage() {
  return (
    <div>
      <Topbar title="Question Reports" subtitle="Review and resolve issues reported by students" />
      <div className="p-6">
        <FeedbackClient />
      </div>
    </div>
  )
}
