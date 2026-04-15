import { prisma } from '@/lib/prisma'
import Topbar from '@/components/admin/Topbar'
import SettingsClient from './SettingsClient'

async function getSettings() {
  const settings = await prisma.setting.findMany()
  return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {})
}

export default async function SettingsPage() {
  const settings = await getSettings()
  return (
    <div>
      <Topbar title="Settings" subtitle="Configure platform settings" />
      <div className="p-6">
        <SettingsClient initialSettings={settings} />
      </div>
    </div>
  )
}
