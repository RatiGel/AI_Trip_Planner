"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  warnings: number;
  createdAt: string;
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  admin: "default",
  business: "secondary",
  tourist: "secondary",
};

export function UsersTable({ users: initial }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ name: "", email: "", role: "tourist" });
  const [loading, setLoading] = useState(false);

  function startEdit(user: AdminUser) {
    setEditId(user.id);
    setEditState({ name: user.name, email: user.email, role: user.role });
  }

  async function saveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Failed to update");
      return;
    }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...editState } : u));
    setEditId(null);
    toast.success("User updated");
  }

  async function toggleSuspend(user: AdminUser) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !user.suspended }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, suspended: !u.suspended } : u));
      toast.success(user.suspended ? "User unsuspended" : "User suspended");
    } else {
      toast.error("Failed to update");
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? Cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User deleted");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to delete");
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) =>
            editId === user.id ? (
              <TableRow key={user.id}>
                <TableCell>
                  <Input value={editState.name} onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))} className="h-8 w-36" />
                </TableCell>
                <TableCell>
                  <Input value={editState.email} onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))} className="h-8 w-44" />
                </TableCell>
                <TableCell>
                  <Select value={editState.role} onValueChange={(v) => setEditState((s) => ({ ...s, role: v ?? s.role }))}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["tourist", "business", "admin"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right space-x-2">
                  <Button size="sm" onClick={() => saveEdit(user.id)} disabled={loading}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[user.role] ?? "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  {user.suspended ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                  {user.warnings > 0 && (
                    <span className="ml-2 text-xs text-amber-500">{user.warnings}⚠</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(user)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleSuspend(user)}>
                    {user.suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id, user.name)}>Delete</Button>
                </TableCell>
              </TableRow>
            )
          )}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
