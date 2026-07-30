import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockCities } from "@/lib/mock/cities";

export default function AdminCities() {
  const t = useTranslations("admin");
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t("cities")}</h1>
        <Button>
          <Plus className="size-4" /> {t("newCity")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Places</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCities.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {locale === "ka" ? c.nameKa : c.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.country}</TableCell>
                <TableCell className="text-right tabular-nums">{c.placesCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
