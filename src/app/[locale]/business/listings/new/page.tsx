import { setRequestLocale } from "next-intl/server";
import { ListingForm } from "@/components/business/listing-form";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
        <p className="text-sm text-muted-foreground">
          Submit a new listing for review. It will go live once approved.
        </p>
      </div>
      <ListingForm />
    </div>
  );
}
