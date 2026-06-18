import { connectDB } from "@/lib/db";
import { SiteConfigModel, type ISiteConfig } from "@/lib/models/site-config";

export async function getSiteConfig(): Promise<ISiteConfig | null> {
  try {
    await connectDB();
    const config = await SiteConfigModel.findOne({ key: "main" }).lean();
    return config as ISiteConfig | null;
  } catch {
    return null;
  }
}
