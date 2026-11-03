import { PublicRepoForm } from "./PublicRepoForm";

export function PublicRepoSection() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">공개 리포</h2>
      <p className="text-muted-foreground text-sm">
        내 GitHub 계정의 공개 리포는 주소만 붙여넣으면 됩니다. 따로 허용할 것이
        없습니다.
      </p>
      <PublicRepoForm />
    </section>
  );
}
