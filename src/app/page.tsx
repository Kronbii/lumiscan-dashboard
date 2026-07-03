import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(rgba(24,33,31,.55),rgba(24,33,31,.35)),url('/clinic-room.png')] bg-cover bg-center">
      <div className="flex min-h-screen items-end">
        <section className="w-full px-6 pb-16 pt-24 sm:px-10 lg:px-16">
          <div className="max-w-3xl text-white">
            <h1 className="text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
              Lumiscan
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
              A clinical workspace for managing patients, recording lesion scans,
              tracking change over time, and keeping follow-up decisions inside the
              doctor&apos;s organization.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app">
                  Open prototype <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/95">
                <Link href="/app/patients">Patients</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
