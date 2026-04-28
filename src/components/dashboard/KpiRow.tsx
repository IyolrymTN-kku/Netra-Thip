import { KpiCard, type KpiCardProps } from "./KpiCard";

interface KpiRowProps {
  cards: KpiCardProps[];
}

export function KpiRow({ cards }: KpiRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} />
      ))}
    </div>
  );
}
