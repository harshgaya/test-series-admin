"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MdDashboard,
  MdSchool,
  MdMenuBook,
  MdBook,
  MdBookmark,
  MdQuiz,
  MdFlag,
  MdAssignment,
  MdLiveTv,
  MdBolt,
  MdPeople,
  MdAttachMoney,
  MdCampaign,
  MdSettings,
  MdLogout,
  MdChevronRight,
} from "react-icons/md";
import { APP_NAME } from "@/lib/constants";

const ACCENT = "#0D9488";
const ACTIVE_BG = "#F0FDFA";
const ACTIVE_TEXT = "#0F766E";
const ACTIVE_ICON = "#0D9488";
const INACTIVE_TEXT = "#6B7280";
const INACTIVE_ICON = "#9CA3AF";
const HOVER_BG = "#F9FAFB";
const SECTION_TEXT = "#9CA3AF";

const ICONS = {
  MdDashboard,
  MdSchool,
  MdMenuBook,
  MdBook,
  MdBookmark,
  MdQuiz,
  MdFlag,
  MdAssignment,
  MdLiveTv,
  MdBolt,
  MdPeople,
  MdAttachMoney,
  MdCampaign,
  MdSettings,
};

const NAV_ITEMS = [
  {
    section: "MAIN",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "MdDashboard" },
    ],
  },
  {
    section: "CONTENT",
    items: [
      { href: "/admin/exams", label: "Exams", icon: "MdSchool" },
      { href: "/admin/subjects", label: "Subjects", icon: "MdMenuBook" },
      { href: "/admin/chapters", label: "Chapters", icon: "MdBook" },
      { href: "/admin/topics", label: "Topics", icon: "MdBookmark" },
    ],
  },
  {
    section: "QUESTIONS",
    items: [
      { href: "/admin/questions", label: "Question Bank", icon: "MdQuiz" },
      { href: "/admin/feedback", label: "Reports", icon: "MdFlag" },
    ],
  },
  {
    section: "TESTS",
    items: [
      { href: "/admin/tests", label: "All Tests", icon: "MdAssignment" },
      { href: "/admin/live-exams", label: "Live Exams", icon: "MdLiveTv" },
      { href: "/admin/crash-courses", label: "Crash Courses", icon: "MdBolt" },
    ],
  },
  {
    section: "STUDENTS",
    items: [
      { href: "/admin/users", label: "Students", icon: "MdPeople" },
      { href: "/admin/revenue", label: "Revenue", icon: "MdAttachMoney" },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      {
        href: "/admin/announcements",
        label: "Announcements",
        icon: "MdCampaign",
      },
      { href: "/admin/settings", label: "Settings", icon: "MdSettings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: ACCENT }}
          >
            <MdSchool className="text-white text-lg" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {APP_NAME}
            </p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} className="mb-5">
            {/* Section label */}
            <p
              className="text-xs font-semibold uppercase px-3 mb-1"
              style={{ color: SECTION_TEXT, letterSpacing: "0.08em" }}
            >
              {group.section}
            </p>

            {/* Nav items */}
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all"
                  style={{
                    background: active ? ACTIVE_BG : "transparent",
                    color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = HOVER_BG;
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {Icon && (
                    <Icon
                      className="text-base flex-shrink-0"
                      style={{ color: active ? ACTIVE_ICON : INACTIVE_ICON }}
                    />
                  )}
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <MdChevronRight
                      className="text-sm flex-shrink-0"
                      style={{ color: ACCENT }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
        >
          <MdLogout className="text-base" />
          Logout
        </button>
      </div>
    </aside>
  );
}
