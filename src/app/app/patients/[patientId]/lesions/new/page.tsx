import Link from "next/link";
import { createLesionAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Fascia, SectionLabel } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { bodyRegions, bodySides } from "@/lib/enums";
import { humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";

export const dynamic = "force-dynamic";

export default async function NewLesionPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const ctx = await getOrgContext();
  const patient = await patientService.getById(ctx, patientId);
  const action = createLesionAction.bind(null, patientId);

  return (
    <div className="mx-auto grid w-full max-w-160 gap-7">
      <PageHeader
        eyebrow={
          <Link
            href={`/app/patients/${patientId}`}
            className="datum hover:text-muted"
          >
            ← {patient.firstName} {patient.lastName}
          </Link>
        }
        title="New lesion"
        description="Record a new lesion to begin tracking scans and change over time."
      />

      <form action={action}>
        <Fascia className="grid-cols-1">
          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="01" title="Anatomical site" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Body region">
                <select className={inputClass} name="bodyRegion" required>
                  {bodyRegions.map((region) => (
                    <option key={region} value={region}>
                      {humanize(region)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Side">
                <select className={inputClass} name="bodySide" required>
                  {bodySides.map((side) => (
                    <option key={side} value={side}>
                      {humanize(side)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Precise location"
              hint="e.g. 4 cm inferior to the left scapula"
            >
              <input className={inputClass} name="bodyLocationNote" required />
            </Field>
          </section>

          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="02" title="Description" />
            <Field label="Clinical description">
              <textarea className={textareaClass} name="description" rows={3} />
            </Field>
          </section>

          <div className="flex items-center justify-between bg-surface px-5 py-3">
            <Button asChild variant="ghost">
              <Link href={`/app/patients/${patientId}`}>Cancel</Link>
            </Button>
            <Button type="submit">Create lesion</Button>
          </div>
        </Fascia>
      </form>
    </div>
  );
}
