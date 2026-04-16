"use client";

import { useRef, useState } from "react";
import {
  MdUpload,
  MdClose,
  MdInsertDriveFile,
  MdImage,
  MdAudiotrack,
  MdVideoLibrary,
} from "react-icons/md";
import toast from "react-hot-toast";

const ACCEPT_MAP = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
};

const ICON_MAP = {
  image: MdImage,
  audio: MdAudiotrack,
  video: MdVideoLibrary,
};

const FOLDER_MAP = {
  image: "questions/images",
  audio: "questions/audio",
  video: "questions/video",
};

const COLOR_MAP = {
  image: { bg: "#EFF6FF", icon: "#2563EB", border: "#BFDBFE" },
  audio: { bg: "#F0FDF4", icon: "#16A34A", border: "#BBF7D0" },
  video: { bg: "#FFF7ED", icon: "#EA580C", border: "#FED7AA" },
};

export default function FileUpload({ type, label, value, onChange }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const Icon = ICON_MAP[type] || MdInsertDriveFile;
  const accept = ACCEPT_MAP[type] || "*/*";
  const folder = FOLDER_MAP[type] || "uploads";
  const colors = COLOR_MAP[type] || {
    bg: "#F9FAFB",
    icon: "#6B7280",
    border: "#E5E7EB",
  };

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    try {
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error("Upload failed — could not get upload URL");
        setUploading(false);
        return;
      }

      const { presignedUrl, publicUrl } = data.data;

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      onChange(publicUrl);
      toast.success(`${label} uploaded!`);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
      setFileName("");
      onChange("");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    onChange("");
    setFileName("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Uploaded — show preview */}
      {value && !uploading ? (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: colors.border }}
        >
          {/* Image preview */}
          {type === "image" && (
            <div className="relative">
              <img
                src={value}
                alt="Preview"
                className="w-full max-h-64 object-contain"
                style={{ background: "#F8FAFC" }}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <MdClose className="text-sm" />
              </button>
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ background: colors.bg }}
              >
                <MdImage style={{ color: colors.icon, fontSize: 15 }} />
                <p className="text-xs text-gray-600 truncate flex-1">
                  {fileName}
                </p>
              </div>
            </div>
          )}

          {/* Audio preview */}
          {type === "audio" && (
            <div className="p-3" style={{ background: colors.bg }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MdAudiotrack style={{ color: colors.icon, fontSize: 18 }} />
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {fileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <MdClose className="text-lg" />
                </button>
              </div>
              <audio controls className="w-full" src={value} />
            </div>
          )}

          {/* Video preview */}
          {type === "video" && (
            <div style={{ background: colors.bg }}>
              <video controls className="w-full max-h-52" src={value} />
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <MdVideoLibrary
                    style={{ color: colors.icon, fontSize: 15 }}
                  />
                  <p className="text-xs text-gray-600 truncate">{fileName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <MdClose className="text-base" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Upload button */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all"
          style={{
            borderColor: uploading ? colors.icon : "#D1D5DB",
            background: uploading ? colors.bg : "#FAFAFA",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = colors.icon;
              e.currentTarget.style.background = colors.bg;
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = "#D1D5DB";
              e.currentTarget.style.background = "#FAFAFA";
            }
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: colors.bg }}
          >
            <Icon style={{ color: colors.icon, fontSize: 18 }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-700">
              {uploading
                ? `Uploading... ${progress}%`
                : `Click to upload ${label.toLowerCase()}`}
            </p>
            <p className="text-xs text-gray-400">
              {type === "image" && "JPG, PNG, WEBP"}
              {type === "audio" && "MP3, WAV, M4A"}
              {type === "video" && "MP4, MOV, WEBM"}
            </p>
          </div>
          <MdUpload className="text-gray-400 text-xl flex-shrink-0" />
        </button>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Uploading {fileName}</span>
            <span
              className="text-xs font-medium"
              style={{ color: colors.icon }}
            >
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-150"
              style={{ width: `${progress}%`, background: colors.icon }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
