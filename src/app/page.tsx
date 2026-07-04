import { ArrowRight, Activity, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  { icon: ScanLine, label: "Serial dermoscopy" },
  { icon: Activity, label: "Change tracking" },
  { icon: Sparkles, label: "AI evolution insights" },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d1b1a]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/clinic-room.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(9,20,19,0.92)_0%,rgba(9,20,19,0.72)_38%,rgba(9,20,19,0.15)_70%,rgba(9,20,19,0.05)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(9,20,19,0.6),transparent_45%)]" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">Lumiscan</span>
          </div>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            Local prototype
          </span>
        </header>

        <section className="flex flex-1 items-center px-6 pb-20 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-teal-300" />
              Clinical lesion intelligence
            </div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
              See what changes,
              <br />
              before it matters.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              A clinical workspace for managing patients, recording lesion scans, and
              tracking change over time — keeping every follow-up decision inside the
              doctor&apos;s organization.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-lg">
                <Link href="/app">
                  Open workspace <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              >
                <Link href="/app/patients">Browse patients</Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-white/70">
                  <f.icon className="size-4 text-teal-300" />
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
