import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface AuditEntry {
  id: string;
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  DELETE_USER: "destructive",
  REMOVE_CONTENT: "destructive",
  REJECT_BUSINESS: "destructive",
  APPROVE_BUSINESS: "default",
  UPDATE_USER: "secondary",
  DISMISS_REPORT: "secondary",
  WARN_USER: "secondary",
};

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">No audit log entries yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Badge variant={ACTION_VARIANT[e.action] ?? "secondary"} className="text-xs">
                  {e.action.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.adminEmail}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {e.targetType && <span className="capitalize">{e.targetType}</span>}
                {e.targetId && <span className="ml-1 font-mono">{e.targetId.slice(-8)}</span>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
