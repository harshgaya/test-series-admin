// ─── App ───────────────────────────────────────────
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "TestSeries Admin";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ─── Auth ──────────────────────────────────────────
export const JWT_EXPIRY = "7d";
export const COOKIE_NAME = "admin_token";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// ─── Pagination ────────────────────────────────────
export const PAGE_SIZE = 20;

// ─── Exam Tracks ───────────────────────────────────
export const TRACKS = [
  { value: "medical", label: "Medical" },
  { value: "engineering", label: "Engineering" },
  { value: "foundation", label: "Foundation" },
];

// ─── Question Types ────────────────────────────────
export const QUESTION_TYPES = [
  { value: "MCQ", label: "MCQ (Single Correct)" },
  { value: "INTEGER", label: "Integer Type" },
  { value: "MULTI_CORRECT", label: "Multi Correct" },
];

// ─── Difficulty ────────────────────────────────────
export const DIFFICULTIES = [
  { value: "EASY", label: "Easy", color: "green" },
  { value: "MEDIUM", label: "Medium", color: "yellow" },
  { value: "HARD", label: "Hard", color: "red" },
];

// ─── Test Types ────────────────────────────────────
export const TEST_TYPES = [
  { value: "TOPIC", label: "Topic-wise Test" },
  { value: "CHAPTER", label: "Chapter-wise Test" },
  { value: "SECTIONAL", label: "Sectional Test" },
  { value: "SUBJECT", label: "Subject-wise Test" },
  { value: "FULL_MOCK", label: "Full Mock Test" },
  { value: "PYP", label: "Previous Year Paper" },
  { value: "LIVE", label: "Live All India Mock" },
  { value: "FREE", label: "Free Test" },
  { value: "SCHOLARSHIP", label: "Scholarship Test" },
  { value: "SPEED", label: "Speed Test" },
  { value: "DPT", label: "Daily Practice Test" },
  { value: "MICRO", label: "Micro Test" },
  { value: "CONCEPT", label: "Concept Test" },
  { value: "DIFFICULTY_LADDER", label: "Difficulty Ladder" },
  { value: "NTA_SIMULATOR", label: "NTA Style Simulator" },
];

// ─── Test Status ───────────────────────────────────
export const TEST_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "gray" },
  { value: "PUBLISHED", label: "Published", color: "green" },
  { value: "SCHEDULED", label: "Scheduled", color: "blue" },
  { value: "CANCELLED", label: "Cancelled", color: "red" },
  { value: "CRASH_ONLY", label: "Crash Course Only", color: "purple" },
];

// ─── Payment Status ────────────────────────────────
export const PAYMENT_STATUSES = [
  { value: "PENDING", label: "Pending", color: "yellow" },
  { value: "SUCCESS", label: "Success", color: "green" },
  { value: "FAILED", label: "Failed", color: "red" },
  { value: "REFUNDED", label: "Refunded", color: "purple" },
];

// ─── Report Types ──────────────────────────────────
export const REPORT_TYPES = [
  { value: "wrong_answer", label: "Wrong Answer" },
  { value: "typo", label: "Typo / Spelling Error" },
  { value: "image_missing", label: "Image Missing" },
  { value: "other", label: "Other" },
];

// ─── Report Status ─────────────────────────────────
export const REPORT_STATUSES = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "resolved", label: "Resolved", color: "green" },
];

// ─── Default Test Settings ─────────────────────────
export const DEFAULT_MARKS_CORRECT = 4;
export const DEFAULT_NEGATIVE_MARKS = -1;
export const DEFAULT_DURATION_MINS = 60;

// ─── Nav Items ─────────────────────────────────────
export const NAV_ITEMS = [
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
