import { Schema, model, models } from "mongoose";

export interface ISiteConfig {
  key: string;
  header: {
    logoText: string;
    logoImageUrl: string;
    navLinks: Array<{ label: string; href: string }>;
  };
  footer: {
    copyrightText: string;
    columns: Array<{
      heading: string;
      links: Array<{ label: string; href: string }>;
    }>;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  pages: Record<
    string,
    {
      heroTitle: string;
      heroSubtitle: string;
      heroImageUrl: string;
      showCategories: boolean;
      showFeaturedPlaces: boolean;
      componentOrder: string[];
    }
  >;
  updatedAt: Date;
}

const NavLinkSchema = new Schema(
  { label: String, href: String },
  { _id: false }
);
const FooterLinkSchema = new Schema(
  { label: String, href: String },
  { _id: false }
);
const FooterColumnSchema = new Schema(
  { heading: String, links: [FooterLinkSchema] },
  { _id: false }
);
const SocialLinkSchema = new Schema(
  { platform: String, url: String },
  { _id: false }
);
const PageConfigSchema = new Schema(
  {
    heroTitle: String,
    heroSubtitle: String,
    heroImageUrl: String,
    showCategories: { type: Boolean, default: true },
    showFeaturedPlaces: { type: Boolean, default: true },
    componentOrder: [String],
  },
  { _id: false }
);

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    key: { type: String, required: true, unique: true },
    header: {
      logoText: { type: String, default: "TbilisiTrip" },
      logoImageUrl: { type: String, default: "" },
      navLinks: { type: [NavLinkSchema], default: [] },
    },
    footer: {
      copyrightText: { type: String, default: "© 2025 TbilisiTrip" },
      columns: { type: [FooterColumnSchema], default: [] },
      socialLinks: { type: [SocialLinkSchema], default: [] },
    },
    pages: { type: Map, of: PageConfigSchema, default: {} },
  },
  { timestamps: true }
);

export const SiteConfigModel =
  models.SiteConfig ?? model<ISiteConfig>("SiteConfig", SiteConfigSchema);
