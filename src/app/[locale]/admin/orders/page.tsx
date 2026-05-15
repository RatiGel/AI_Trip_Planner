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

const MOCK_ORDERS = [
  { id: "o-1", type: "rail", route: "Tbilisi → Batumi", date: "2026-05-22", price: 55, status: "paid" },
  { id: "o-2", type: "bus",  route: "Tbilisi → Kazbegi", date: "2026-05-23", price: 25, status: "pending" },
  { id: "o-3", type: "transit-pass", route: "3-day Tbilisi pass", date: "2026-05-21", price: 7, status: "paid" },
  { id: "o-4", type: "rail", route: "Tbilisi → Kutaisi", date: "2026-05-24", price: 40, status: "refunded" },
];

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  refunded: "destructive",
};

export default function AdminOrders() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("ticketOrders")}</h1>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_ORDERS.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Badge variant="outline">{o.type}</Badge></TableCell>
                <TableCell className="font-medium">{o.route}</TableCell>
                <TableCell>{o.date}</TableCell>
                <TableCell className="text-right tabular-nums">{o.price}₾</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[o.status]}>{o.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
