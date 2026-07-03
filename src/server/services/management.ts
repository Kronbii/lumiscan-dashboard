import type { OrgContext } from "@/server/auth/org-context";
import { requireRole } from "@/server/auth/require-role";
import { audit } from "@/server/audit/audit";
import { repo } from "@/server/db/scoped-repo";
import type {
  AddManagementNoteInput,
  SetManagementStatusInput,
} from "@/lib/schemas/management";

export const managementService = {
  async getPlan(ctx: OrgContext, lesionId: string) {
    return repo(ctx).management.getPlan(lesionId);
  },

  async listNotes(ctx: OrgContext, lesionId: string) {
    return repo(ctx).management.listNotes(lesionId);
  },

  async setStatus(ctx: OrgContext, input: SetManagementStatusInput) {
    requireRole(ctx, ["OWNER", "ADMIN", "DOCTOR"]);
    const plan = await repo(ctx).management.setStatus(input.lesionId, input.status);
    await audit(ctx, {
      action: "management.status",
      resourceType: "management_plan",
      resourceId: plan.id,
      metadata: { status: input.status },
    });
    return plan;
  },

  async addNote(ctx: OrgContext, input: AddManagementNoteInput) {
    requireRole(ctx, ["OWNER", "ADMIN", "DOCTOR"]);
    const note = await repo(ctx).management.addNote(input.lesionId, input.body);
    await audit(ctx, {
      action: "management.note",
      resourceType: "management_note",
      resourceId: note.id,
    });
    return note;
  },
};
