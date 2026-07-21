import Link from "next/link";

export default function NoCatNotice() {
  return (
    <div className="min-h-screen bg-canvas pb-24 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-stone-100 px-6 py-8 text-center max-w-xs w-full">
        <p className="text-3xl mb-3">🐈</p>
        <p className="text-sm font-bold text-stone-800 mb-1">まだねこが登録されていません</p>
        <p className="text-xs text-stone-500 mb-5">
          ねこを登録すると、ごはんやトイレを記録できるようになります
        </p>
        <Link href="/settings" className="btn-primary inline-block w-full py-3 text-sm">
          ねこを登録する
        </Link>
      </div>
    </div>
  );
}
