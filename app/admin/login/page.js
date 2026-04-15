"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdEmail, MdLock, MdLogin, MdSchool } from "react-icons/md";
import toast from "react-hot-toast";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Login successful!");
        router.push("/admin/dashboard");
      } else {
        toast.error(data.error || "Invalid credentials");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div
        className="hidden lg:flex w-96 flex-col justify-between p-10 flex-shrink-0"
        style={{ background: "#134E4A" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#0D9488" }}
          >
            <MdSchool className="text-white text-xl" />
          </div>
          <span className="text-white font-medium">{APP_NAME}</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-white text-3xl font-medium leading-snug">
            Manage your entire platform from one place
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#99F6E4" }}>
            Questions, tests, students and revenue — all in one dashboard.
          </p>
          <ul className="space-y-3">
            {[
              "Question bank with LaTeX support",
              "NEET · JEE · EAMCET · NTSE · Olympiad",
              "Live exam monitoring and analytics",
              "Revenue tracking and student management",
            ].map((f) => (
              <li
                key={f}
                className="flex items-center gap-3 text-sm"
                style={{ color: "#CCFBF1" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#0D9488" }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs" style={{ color: "#5EEAD4" }}>
          © 2025 TestSeries. All rights reserved.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 mb-7">
              Sign in to your admin account
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  <input
                    type="email"
                    placeholder="admin@testseries.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-transparent"
                    style={{ "--tw-ring-color": "#0D9488" }}
                    onFocus={(e) =>
                      (e.target.style.boxShadow = "0 0 0 2px #0D9488")
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-transparent"
                    onFocus={(e) =>
                      (e.target.style.boxShadow = "0 0 0 2px #0D9488")
                    }
                    onBlur={(e) => (e.target.style.boxShadow = "none")}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ background: loading ? "#0F766E" : "#0D9488" }}
                onMouseEnter={(e) => (e.target.style.background = "#0F766E")}
                onMouseLeave={(e) => (e.target.style.background = "#0D9488")}
              >
                <MdLogin className="text-base" />
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
