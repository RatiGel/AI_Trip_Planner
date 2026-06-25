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
  try {
    const colors = config.colors ?? ({} as IAdminConfig["colors"]);
    const typography = config.typography ?? ({} as IAdminConfig["typography"]);
    return `:root {
  --color-wine: ${colors.wine ?? "#B5271D"};
  --color-gold: ${colors.gold ?? "#E8A020"};
  --admin-font-family: ${typography.fontFamily ?? "Inter"}, sans-serif;
  --admin-base-font-size: ${typography.baseFontSizePx ?? 16}px;
}`;
  } catch {
    return "";
  }
}
