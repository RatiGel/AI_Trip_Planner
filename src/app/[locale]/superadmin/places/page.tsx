import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { mockPlaces } from "@/lib/mock/places";

export default function AdminPlaces() {
  const t = useTranslations("admin");
  const tCat = useTranslations("categories");
  const locale = useLocale();
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
              <TableHead className="text-right">Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPlaces.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {locale === "ka" ? p.nameKa : p.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.citySlug}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.categories.map((c) => (
                      <Badge key={c} variant="outline">{tCat(c)}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.rating.toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
