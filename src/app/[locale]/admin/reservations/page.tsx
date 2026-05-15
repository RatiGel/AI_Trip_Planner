import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MOCK_RESERVATIONS = [
  { id: "res-1", place: "Stamba Cafe", datetime: "2026-05-22 19:30", size: 4, status: "confirmed" },
  { id: "res-2", place: "Shavi Lomi", datetime: "2026-05-23 20:00", size: 2, status: "pending" },
  { id: "res-3", place: "Stamba Cafe", datetime: "2026-05-24 13:00", size: 6, status: "confirmed" },
  { id: "res-4", place: "Shavi Lomi", datetime: "2026-05-25 21:00", size: 3, status: "cancelled" },
];

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

export default function AdminReservations() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("reservations")}</h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Place</TableHead>
              <TableHead>Date / time</TableHead>
              <TableHead className="text-right">Party</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RESERVATIONS.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.place}</TableCell>
                <TableCell>{r.datetime}</TableCell>
                <TableCell className="text-right">{r.size}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[r.status]}>{r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
