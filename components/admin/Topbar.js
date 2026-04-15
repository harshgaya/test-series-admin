import { MdNotifications, MdPerson } from 'react-icons/md'

export default function Topbar({ title, subtitle }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative">
          <MdNotifications className="text-xl" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <MdPerson className="text-blue-600 text-lg" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 leading-tight">Admin</p>
            <p className="text-xs text-gray-400">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
