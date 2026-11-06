type Props = {
  scansUsed: number;
  scansLimit: number;
  tokenPercent: number;
};

/** 이번 달에 얼마나 썼는지. 한도에 닿아 갑자기 막히지 않도록 미리 보여 준다. */
export function UsageMeter({ scansUsed, scansLimit, tokenPercent }: Props) {
  return (
    <p className="text-muted-foreground text-sm">
      이번 달 사용량: 점검 {scansUsed}/{scansLimit}회 · AI {tokenPercent}%
    </p>
  );
}
