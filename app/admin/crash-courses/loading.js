export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-7 h-7 border-2 border-gray-200 rounded-full animate-spin"
        style={{ borderTopColor: "#0D9488" }}
      />
    </div>
  );
}
