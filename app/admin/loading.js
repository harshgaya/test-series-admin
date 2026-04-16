export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin"
          style={{ borderTopColor: "#0D9488" }}
        />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
