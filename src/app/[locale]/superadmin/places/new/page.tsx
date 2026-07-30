import { useTranslations } from "next-intl";
import { PlaceForm } from "@/components/admin/place-form";

export default function NewPlace() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("newPlace")}</h1>
        <p className="text-muted-foreground">Create a new POI for visitors to discover.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <PlaceForm />
      </div>
    </div>
  );
}
