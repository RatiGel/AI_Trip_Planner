import { connectDB } from "@/lib/db";
import {
  SiteConfigModel,
  DEFAULT_LISTING_FEE_TETRI,
} from "@/lib/models/site-config";
import { UserModel } from "@/lib/models/user";

/** The global default listing fee (tetri), falling back to the constant. */
export async function getGlobalListingFeeTetri(): Promise<number> {
  await connectDB();
  const config = await SiteConfigModel.findOne({ key: "main" })
    .select("listingFeeTetri")
    .lean<{ listingFeeTetri?: number }>();
  return config?.listingFeeTetri ?? DEFAULT_LISTING_FEE_TETRI;
}

export type ResolvedFee = { exempt: boolean; amountTetri: number };

/**
 * Resolve the listing fee for a given owner: an explicit exemption wins, then a
 * per-owner override, otherwise the global default. The fee is charged per
 * listing; this only decides the rate / exemption for that owner.
 */
export async function resolveListingFee(
  ownerId: string | undefined
): Promise<ResolvedFee> {
  const global = await getGlobalListingFeeTetri();
  if (!ownerId) return { exempt: false, amountTetri: global };

  const owner = await UserModel.findById(ownerId)
    .select("feeExempt feeOverrideTetri")
    .lean<{ feeExempt?: boolean; feeOverrideTetri?: number }>();

  if (owner?.feeExempt) return { exempt: true, amountTetri: 0 };
  if (typeof owner?.feeOverrideTetri === "number")
    return { exempt: false, amountTetri: owner.feeOverrideTetri };
  return { exempt: false, amountTetri: global };
}
