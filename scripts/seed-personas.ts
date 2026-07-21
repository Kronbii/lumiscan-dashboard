import { sql } from "@/server/db/client";
import {
  upsertMembership,
  upsertOrganization,
  upsertUser,
} from "@/server/db/system-repo";
import type { UserRole } from "@/lib/enums";

/*
  Seeds the switchable demo personas for the showcase. No real auth — these are
  identities the "Acting as" switcher toggles between. Idempotent (keyed on
  clerkUserId), so it is safe to re-run.
*/
const PERSONAS: Array<{
  clerkUserId: string;
  email: string;
  displayName: string;
  role: UserRole;
}> = [
  { clerkUserId: "prototype_user", email: "e.reyes@prototype.clinic", displayName: "Dr. Elena Reyes", role: "OWNER" },
  { clerkUserId: "persona_doctor", email: "m.okafor@prototype.clinic", displayName: "Dr. Marcus Okafor", role: "DOCTOR" },
  { clerkUserId: "persona_nurse", email: "p.shah@prototype.clinic", displayName: "Priya Shah, RN", role: "NURSE" },
  { clerkUserId: "persona_admin", email: "s.lind@prototype.clinic", displayName: "Sofia Lind", role: "ADMIN" },
];

async function main() {
  const org = await upsertOrganization({
    clerkOrgId: "prototype_org",
    name: "Prototype Clinic",
    slug: "prototype-clinic",
  });
  for (const persona of PERSONAS) {
    const user = await upsertUser({
      clerkUserId: persona.clerkUserId,
      email: persona.email,
      displayName: persona.displayName,
    });
    await upsertMembership({
      orgId: org.id,
      userId: user.id,
      role: persona.role,
      status: "ACTIVE",
    });
    console.log(`persona ready: ${persona.displayName} (${persona.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
