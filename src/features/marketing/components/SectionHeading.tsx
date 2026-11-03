type Props = { id: string; eyebrow: string; title: string; text?: string };

export function SectionHeading({ id, eyebrow, title, text }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground font-mono text-xs">{eyebrow}</p>
      <h2
        id={id}
        className="text-2xl font-semibold tracking-tight break-keep sm:text-3xl"
      >
        {title}
      </h2>
      {text ? (
        <p className="text-muted-foreground text-sm break-keep">{text}</p>
      ) : null}
    </div>
  );
}
