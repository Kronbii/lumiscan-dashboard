"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { classificationTone, Datum, StatusChip } from "@/components/ui/instrument";
import { cn, formatDate } from "@/lib/utils";

export type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  lesionCount: number;
  risk: string | null;
  lastScanAt: string | null;
};

type SortKey = "name" | "age" | "lesions" | "risk" | "lastScan";
type RiskFilter = "ALL" | "FLAGGED" | "SUSPICIOUS" | "MALIGNANT";

const flaggedRule: Record<string, string> = {
  MALIGNANT: "border-l-2 border-l-malignant",
  SUSPICIOUS: "border-l-2 border-l-suspicious",
};
const riskRank: Record<string, number> = { MALIGNANT: 3, SUSPICIOUS: 2, INCONCLUSIVE: 1, BENIGN: 0 };

function age(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return years;
}

function relativeDays(iso: string | null) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const FILTERS: RiskFilter[] = ["ALL", "FLAGGED", "SUSPICIOUS", "MALIGNANT"];

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RiskFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = patients.filter((p) => {
      if (q && !`${p.firstName} ${p.lastName} ${p.lastName} ${p.firstName} ${p.mrn}`.toLowerCase().includes(q))
        return false;
      if (filter === "FLAGGED") return p.risk === "SUSPICIOUS" || p.risk === "MALIGNANT";
      if (filter === "SUSPICIOUS") return p.risk === "SUSPICIOUS";
      if (filter === "MALIGNANT") return p.risk === "MALIGNANT";
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    out = [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case "age":
          cmp = age(a.dateOfBirth) - age(b.dateOfBirth);
          break;
        case "lesions":
          cmp = a.lesionCount - b.lesionCount;
          break;
        case "risk":
          cmp = (a.risk ? riskRank[a.risk] ?? -1 : -1) - (b.risk ? riskRank[b.risk] ?? -1 : -1);
          break;
        case "lastScan":
          cmp = (a.lastScanAt ? Date.parse(a.lastScanAt) : 0) - (b.lastScanAt ? Date.parse(b.lastScanAt) : 0);
          break;
      }
      if (cmp === 0) cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      return cmp * dir;
    });
    return out;
  }, [patients, query, filter, sortKey, sortDir]);

  const caret = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const Th = ({ label, k, right }: { label: string; k: SortKey; right?: boolean }) => (
    <th className={cn("px-4", right && "text-right")}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "overline font-medium transition-colors hover:text-foreground",
          sortKey === k ? "text-foreground" : "text-faint",
        )}
      >
        {label}
        <span className="datum">{caret(k)}</span>
      </button>
    </th>
  );

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Search className="size-4 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or MRN…"
            aria-label="Search patients"
            className="w-full bg-transparent text-[0.8125rem] text-foreground outline-none placeholder:text-faint sm:w-64"
          />
        </div>
        <div className="inline-flex self-start rounded-sm border border-border-strong sm:self-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "datum h-7 border-l border-border-strong px-2.5 text-[0.625rem] font-medium uppercase tracking-[0.08em] transition-colors first:border-l-0",
                filter === f
                  ? "bg-foreground text-surface"
                  : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[0.8125rem]">
          <thead>
            <tr className="h-10 border-b border-border-strong">
              <Th label="Name" k="name" />
              <th className="overline px-4 font-medium text-faint">MRN</th>
              <Th label="Age" k="age" right />
              <Th label="Lesions" k="lesions" right />
              <Th label="Highest risk" k="risk" />
              <Th label="Last scan" k="lastScan" right />
              <th className="w-10 px-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((patient) => {
              const name = `${patient.firstName} ${patient.lastName}`;
              const href = `/app/patients/${patient.id}`;
              const risk = patient.risk;
              return (
                <tr
                  key={patient.id}
                  onClick={() => router.push(href)}
                  className={cn(
                    "group h-10 cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2",
                    risk && flaggedRule[risk] ? flaggedRule[risk] : "",
                  )}
                >
                  <td className="px-4">
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 outline-none focus-visible:text-primary"
                    >
                      <Avatar name={name} size="sm" />
                      <span className="font-medium text-foreground">
                        {patient.lastName}, {patient.firstName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4">
                    <Datum className="text-xs text-muted">{patient.mrn}</Datum>
                  </td>
                  <td className="px-4 text-right">
                    <Datum className="text-xs text-muted">{age(patient.dateOfBirth)}</Datum>
                    <span className="ml-1 text-[0.6875rem] text-faint">yrs</span>
                  </td>
                  <td className="px-4 text-right">
                    <Datum className="text-xs text-muted">{patient.lesionCount}</Datum>
                  </td>
                  <td className="px-4">
                    {risk ? (
                      <StatusChip label={risk} tone={classificationTone(risk)} />
                    ) : (
                      <Datum className="text-xs text-faint">—</Datum>
                    )}
                  </td>
                  <td className="px-4 text-right">
                    <Datum
                      className={cn(
                        "text-xs",
                        patient.lastScanAt ? "text-muted" : "text-faint",
                      )}
                      title={patient.lastScanAt ? formatDate(patient.lastScanAt) : undefined}
                    >
                      {relativeDays(patient.lastScanAt)}
                    </Datum>
                  </td>
                  <td className="px-4">
                    <ChevronRight
                      className="size-4 text-faint transition-colors group-hover:text-muted"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[0.8125rem] text-muted">
                  {query.trim() ? `No patients match “${query}”.` : "No patients in this view."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-2">
        <Datum className="text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
          {query.trim() || filter !== "ALL"
            ? `${rows.length} of ${patients.length} shown`
            : `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`}
        </Datum>
      </div>
    </>
  );
}
