import { Button } from "@/shared/ui/button";
import { signInWithGitHub } from "../actions";

type Props = { next?: string };

export function GitHubSignInForm({ next }: Props) {
  return (
    <form action={signInWithGitHub}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" size="lg" className="w-full">
        GitHub로 계속하기
      </Button>
    </form>
  );
}
