import { connectDB } from "@/lib/db";
import { AdminConfigModel, type IAdminConfig } from "@/lib/models/admin-config";

export async function getAdminConfig(): Promise<IAdminConfig | null> {
  try {
    await connectDB();
    const config = await AdminConfigModel.findOne({ key: "theme" }).lean();
    return config as IAdminConfig | null;
  } catch {
    return null;
  }
}

export function buildThemeCss(config: IAdminConfig): string {
  const { colors, typography } = config;
  return `:root {
  --color-wine: ${colors.wine};
  --color-gold: ${colors.gold};
  --admin-font-family: ${typography.fontFamily}, sans-serif;
  --admin-base-font-size: ${typography.baseFontSizePx}px;
}`;
}
