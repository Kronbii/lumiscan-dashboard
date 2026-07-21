"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { classificationTone, Datum, StatusChip } from "@/components/ui/instrument";
import { formatDate } from "@/lib/utils";

export type PatientRow = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  lesionCount: number;
  risk: string | null;
};

const flaggedRule: Record<string, string> = {
  MALIGNANT: "border-l-2 border-l-malignant",
  SUSPICIOUS: "border-l-2 border-l-suspicious",
};

function age(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return years;
}

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        `${p.lastName} ${p.firstName}`.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q),
    );
  }, [query, patients]);

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
        <Search className="size-4 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or MRN…"
          aria-label="Search patients"
          className="w-full bg-transparent text-[0.8125rem] text-foreground outline-none placeholder:text-faint"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[0.8125rem]">
          <thead>
            <tr className="h-10 border-b border-border-strong">
              <th className="overline px-4 font-medium">Name</th>
              <th className="overline px-4 font-medium">MRN</th>
              <th className="overline px-4 font-medium">Date of birth</th>
              <th className="overline px-4 text-right font-medium">Age</th>
              <th className="overline px-4 text-right font-medium">Lesions</th>
              <th className="overline px-4 font-medium">Highest risk</th>
              <th className="w-10 px-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => {
              const name = `${patient.firstName} ${patient.lastName}`;
              const risk = patient.risk;
              return (
                <tr
                  key={patient.id}
                  className={`group h-10 border-b border-border transition-colors last:border-0 hover:bg-surface-2 ${
                    risk && flaggedRule[risk] ? flaggedRule[risk] : ""
                  }`}
                >
                  <td className="px-4">
                    <Link href={`/app/patients/${patient.id}`} className="flex items-center gap-3">
                      <Avatar name={name} size="sm" />
                      <span className="font-medium text-foreground">
                        {patient.lastName}, {patient.firstName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4">
                    <Datum className="text-xs text-muted">{patient.mrn}</Datum>
                  </td>
                  <td className="px-4">
                    <Datum className="text-xs text-muted">{formatDate(patient.dateOfBirth)}</Datum>
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
                  <td className="px-4">
                    <Link
                      href={`/app/patients/${patient.id}`}
                      className="flex justify-end text-faint transition-colors group-hover:text-muted"
                      aria-label={`Open ${name}`}
                    >
                      <ChevronRight className="size-4" strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[0.8125rem] text-muted">
                  No patients match “{query}”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-2">
        <Datum className="text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
          {query.trim()
            ? `${filtered.length} of ${patients.length} shown`
            : `${patients.length} ${patients.length === 1 ? "patient" : "patients"}`}
        </Datum>
      </div>
    </>
  );
}
