/**
 * Mongo filter clause that matches only PUBLIC-facing listings.
 *
 * A listing is published when status === "active" (admin-approved AND the
 * listing fee is paid). Legacy/seed/admin places created before the lifecycle
 * existed have no `status` field — treat those as published too so existing
 * content keeps showing.
 *
 * Business-owner listings sitting in draft/pending/approved/rejected stay
 * hidden from the public site until they go active.
 *
 * Spread into a query: `PlaceModel.find({ citySlug, ...PUBLISHED })`.
 */
export const PUBLISHED: Record<string, unknown> = {
  $or: [{ status: "active" }, { status: { $exists: false } }],
};
