import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { connectDB } from "@/lib/db";
import { PlaceModel } from "@/lib/models/place";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  approved: "secondary",
  pending: "secondary",
  draft: "outline",
  rejected: "destructive",
};

export default async function SuperadminPlaces({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const tCat = await getTranslations("categories");

  await connectDB();
  const docs = (await PlaceModel.find()
    .select("name nameKa citySlug categories rating status")
    .sort({ createdAt: -1 })
    .lean()) as Array<{
    _id: unknown;
    name?: string;
    nameKa?: string;
    citySlug?: string;
    categories?: string[];
    rating?: number;
    status?: string;
  }>;

  const places = docs.map((p) => ({
    id: String(p._id),
    name: p.name ?? "",
    nameKa: p.nameKa ?? "",
    citySlug: p.citySlug ?? "",
    categories: p.categories ?? [],
    rating: typeof p.rating === "number" ? p.rating : null,
    status: p.status ?? "active",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t("places")}</h1>
        <Button asChild>
          <Link href="/superadmin/places/new">
            <Plus className="size-4" /> {t("newPlace")}
          </Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">{t("edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {places.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {locale === "ka" && p.nameKa ? p.nameKa : p.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.citySlug}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.categories.map((c) => (
                      <Badge key={c} variant="outline">
                        {tCat.has(c) ? tCat(c) : c}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.rating !== null ? p.rating.toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/business/listings/${p.id}/edit`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("edit")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
