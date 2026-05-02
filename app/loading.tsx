export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
      <div className="text-center space-y-3">
        <div className="text-5xl animate-bounce">🐱</div>
        <p className="text-sm text-stone-400">読み込み中...</p>
      </div>
    </div>
  );
}
