export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-[#2B45F5] border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium">{label}</p>
    </div>
  );
}
