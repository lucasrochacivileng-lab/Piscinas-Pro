export function StatusBadge({ status }: { status: "PASS" | "FAIL" | "REQUIRES_REVIEW" }) {
  const label = status === "PASS" ? "Aprovado" : status === "FAIL" ? "Não atende" : "Revisar";
  return <span className={`status status-${status.toLowerCase()}`}>{label}</span>;
}
