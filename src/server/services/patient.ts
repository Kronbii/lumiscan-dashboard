import type { OrgContext } from "@/server/auth/org-context";
import { audit } from "@/server/audit/audit";
import { repo } from "@/server/db/scoped-repo";
import type { PatientCreateInput, PatientUpdateInput } from "@/lib/schemas/patient";

export const patientService = {
  list(ctx: OrgContext) {
    return repo(ctx).patients.list();
  },

  getById(ctx: OrgContext, id: string) {
    return repo(ctx).patients.getById(id);
  },

  async create(ctx: OrgContext, input: PatientCreateInput) {
    const patient = await repo(ctx).patients.create(input);
    await audit(ctx, {
      action: "patient.create",
      resourceType: "patient",
      resourceId: patient.id,
    });
    return patient;
  },

  async update(ctx: OrgContext, input: PatientUpdateInput) {
    const patient = await repo(ctx).patients.update(input);
    await audit(ctx, {
      action: "patient.update",
      resourceType: "patient",
      resourceId: patient.id,
    });
    return patient;
  },

  async softDelete(ctx: OrgContext, id: string) {
    const patient = await repo(ctx).patients.softDelete(id);
    await audit(ctx, {
      action: "patient.soft_delete",
      resourceType: "patient",
      resourceId: patient.id,
    });
    return patient;
  },
};
