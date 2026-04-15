export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-600',   text: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-600',  text: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-600', text: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-600',    text: 'text-red-600' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 ${c.icon} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon className="text-white text-xl" />
          </div>
        )}
      </div>
    </div>
  )
}
