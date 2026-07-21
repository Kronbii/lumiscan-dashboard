import Link from "next/link";
import { deleteLesionAction, updateLesionAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Fascia, SectionLabel } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { bodyRegions, bodySides } from "@/lib/enums";
import { formatLesionSite, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";
import { notFoundIfMissing } from "@/lib/rsc";

export const dynamic = "force-dynamic";

export default async function EditLesionPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const lesion = await lesionService.getById(ctx, lesionId).catch(notFoundIfMissing);
  const site = formatLesionSite(lesion.bodySide, lesion.bodyRegion);
  const lesionHref = `/app/patients/${patientId}/lesions/${lesionId}`;
  const save = updateLesionAction.bind(null, patientId, lesionId);
  const remove = deleteLesionAction.bind(null, patientId, lesionId);

  return (
    <div className="mx-auto grid w-full max-w-160 gap-7">
      <PageHeader
        eyebrow={
          <Link href={lesionHref} className="datum hover:text-muted">
            ← {site}
          </Link>
        }
        title="Edit lesion"
        description="Correct this lesion's site or clinical description."
      />

      <form action={save}>
        <Fascia className="grid-cols-1">
          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="01" title="Anatomical site" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Body region">
                <select className={inputClass} name="bodyRegion" defaultValue={lesion.bodyRegion} required>
                  {bodyRegions.map((region) => (
                    <option key={region} value={region}>
                      {humanize(region)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Side">
                <select className={inputClass} name="bodySide" defaultValue={lesion.bodySide} required>
                  {bodySides.map((side) => (
                    <option key={side} value={side}>
                      {humanize(side)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Precise location" hint="e.g. 4 cm inferior to the left scapula">
              <input
                className={inputClass}
                name="bodyLocationNote"
                defaultValue={lesion.bodyLocationNote}
                required
              />
            </Field>
          </section>

          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="02" title="Description" />
            <Field label="Clinical description">
              <textarea
                className={textareaClass}
                name="description"
                rows={3}
                defaultValue={lesion.description ?? ""}
              />
            </Field>
          </section>

          <div className="flex items-center justify-end gap-2 bg-surface px-5 py-3">
            <Button asChild variant="ghost">
              <Link href={lesionHref}>Cancel</Link>
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </Fascia>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-malignant-border bg-surface px-5 py-4">
        <div>
          <SectionLabel index="03" title="Danger zone" />
          <p className="mt-1 text-[0.8125rem] text-muted">
            Removes this lesion and its scans from the patient.
          </p>
        </div>
        <ConfirmAction
          action={remove}
          label="Delete lesion"
          message="Removes this lesion and its scans from the patient."
        />
      </div>
    </div>
  );
}
