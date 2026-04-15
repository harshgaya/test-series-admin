"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  MdSave,
  MdSettings,
  MdPayment,
  MdStorage,
  MdSchool,
} from "react-icons/md";

const ACCENT = "#0D9488";
const ACCENT_LIGHT = "#F0FDFA";
const ACCENT_BORDER = "#99F6E4";

export default function SettingsClient({ initialSettings }) {
  const [settings, setSettings] = useState({
    razorpay_key_id: initialSettings.razorpay_key_id || "",
    razorpay_key_secret: initialSettings.razorpay_key_secret || "",
    default_negative_mark: initialSettings.default_negative_mark || "-1",
    default_marks_correct: initialSettings.default_marks_correct || "4",
    storage_provider: initialSettings.storage_provider || "r2",
    site_name: initialSettings.site_name || "TestSeries",
    r2_account_id: initialSettings.r2_account_id || "",
    r2_access_key_id: initialSettings.r2_access_key_id || "",
    r2_secret_key: initialSettings.r2_secret_key || "",
    r2_bucket_name: initialSettings.r2_bucket_name || "",
    r2_public_url: initialSettings.r2_public_url || "",
    bunny_storage_key: initialSettings.bunny_storage_key || "",
    bunny_stream_key: initialSettings.bunny_stream_key || "",
  });
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function SectionHeader({ icon: Icon, title }) {
    return (
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: ACCENT_LIGHT }}
        >
          <Icon style={{ color: ACCENT, fontSize: 18 }} />
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
    );
  }

  function Field({ label, hint, children }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {children}
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* General */}
      <div className="card p-6">
        <SectionHeader icon={MdSchool} title="General" />
        <Field label="Site Name">
          <input
            className="input-field w-72"
            value={settings.site_name}
            onChange={(e) => set("site_name", e.target.value)}
          />
        </Field>
      </div>

      {/* Test Defaults */}
      <div className="card p-6">
        <SectionHeader icon={MdSettings} title="Test Defaults" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Marks per Correct Answer">
            <input
              type="number"
              className="input-field"
              value={settings.default_marks_correct}
              onChange={(e) => set("default_marks_correct", e.target.value)}
            />
          </Field>
          <Field label="Negative Marking" hint="Use negative value e.g. -1">
            <input
              type="number"
              step="0.5"
              className="input-field"
              value={settings.default_negative_mark}
              onChange={(e) => set("default_negative_mark", e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Razorpay */}
      <div className="card p-6">
        <SectionHeader icon={MdPayment} title="Razorpay Payments" />
        <div className="space-y-4">
          <Field label="Razorpay Key ID">
            <input
              className="input-field"
              placeholder="rzp_live_..."
              value={settings.razorpay_key_id}
              onChange={(e) => set("razorpay_key_id", e.target.value)}
            />
          </Field>
          <Field label="Razorpay Key Secret">
            <input
              type="password"
              className="input-field"
              placeholder="••••••••••••"
              value={settings.razorpay_key_secret}
              onChange={(e) => set("razorpay_key_secret", e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Storage */}
      <div className="card p-6">
        <SectionHeader icon={MdStorage} title="File Storage" />
        <div className="space-y-4">
          <Field label="Storage Provider">
            <select
              className="input-field w-48"
              value={settings.storage_provider}
              onChange={(e) => set("storage_provider", e.target.value)}
            >
              <option value="r2">Cloudflare R2</option>
              <option value="bunny">Bunny.net</option>
            </select>
          </Field>

          {settings.storage_provider === "r2" && (
            <div
              className="space-y-3 pl-4 rounded-r-lg py-3"
              style={{ borderLeft: `2px solid ${ACCENT_BORDER}` }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: ACCENT }}
              >
                Cloudflare R2 Settings
              </p>
              {[
                { key: "r2_account_id", label: "Account ID" },
                { key: "r2_access_key_id", label: "Access Key ID" },
                {
                  key: "r2_secret_key",
                  label: "Secret Access Key",
                  type: "password",
                },
                { key: "r2_bucket_name", label: "Bucket Name" },
                {
                  key: "r2_public_url",
                  label: "Public URL",
                  placeholder: "https://files.yourdomain.com",
                },
              ].map(({ key, label, type, placeholder }) => (
                <Field key={key} label={label}>
                  <input
                    type={type || "text"}
                    className="input-field"
                    placeholder={placeholder}
                    value={settings[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          )}

          {settings.storage_provider === "bunny" && (
            <div
              className="space-y-3 pl-4 rounded-r-lg py-3"
              style={{ borderLeft: "2px solid #FED7AA" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                Bunny.net Settings
              </p>
              <Field label="Bunny Storage API Key">
                <input
                  type="password"
                  className="input-field"
                  value={settings.bunny_storage_key}
                  onChange={(e) => set("bunny_storage_key", e.target.value)}
                />
              </Field>
              <Field label="Bunny Stream API Key">
                <input
                  type="password"
                  className="input-field"
                  value={settings.bunny_stream_key}
                  onChange={(e) => set("bunny_stream_key", e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary px-8 py-3 text-sm"
        >
          <MdSave className="text-lg" />
          {loading ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
