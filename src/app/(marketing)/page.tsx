export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">레고</h1>
      <p className="text-foreground/70 text-lg">
        GitHub 리포를 연결하면 AI로 만든 앱에서 자주 생기는 보안 실수를 찾고,
        바로 붙여넣을 수 있는 수정 프롬프트를 드립니다.
      </p>
    </main>
  );
}
