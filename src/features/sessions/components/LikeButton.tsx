"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/shared/ui/button";
import { toggleLikeAction } from "../actions";

type Props = {
  sessionId: string;
  slug: string;
  liked: boolean;
  count: number;
  loggedIn: boolean;
};

export function LikeButton({ sessionId, slug, liked, count, loggedIn }: Props) {
  const [state, setState] = useState({ liked, count });
  const [isPending, startTransition] = useTransition();
  if (!loggedIn) {
    return (
      <Link
        href={`/login?next=/s/${slug}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Heart /> {count}
      </Link>
    );
  }
  const toggle = () =>
    startTransition(async () => {
      const result = await toggleLikeAction({ sessionId });
      if (result.ok) {
        setState((s) => ({
          liked: result.data.liked,
          count: s.count + (result.data.liked ? 1 : -1),
        }));
      }
    });
  return (
    <Button
      size="sm"
      variant={state.liked ? "default" : "outline"}
      aria-pressed={state.liked}
      onClick={toggle}
      disabled={isPending}
    >
      <Heart /> {state.count}
    </Button>
  );
}
