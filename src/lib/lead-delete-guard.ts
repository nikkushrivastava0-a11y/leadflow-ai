/**
 * Deleting with Supabase can return no error even when RLS prevents
 * any row from being affected. Never claim a deletion from an empty result.
 */
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function isValidLeadId(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

export type LeadDeleteResult =
  | { confirmed: true }
  | { confirmed: false; message: string };

export function verifyLeadDeletion(
  requestedId: string,
  deletedRows: readonly { id: string }[] | null,
  databaseError: unknown
): LeadDeleteResult {
  if (!isValidLeadId(requestedId)) {
    return { confirmed: false, message: "Invalid lead selection." };
  }

  if (databaseError) {
    return {
      confirmed: false,
      message: "Could not delete the lead. Please try again.",
    };
  }

  // A missing row and an RLS-denied row intentionally look identical.
  // Do not leak to a user whether another business owns a lead ID.
  if (
    !Array.isArray(deletedRows) ||
    deletedRows.length !== 1 ||
    deletedRows[0]?.id !== requestedId
  ) {
    return {
      confirmed: false,
      message: "Lead deletion was not confirmed. Refresh and check access.",
    };
  }

  return { confirmed: true };
}
