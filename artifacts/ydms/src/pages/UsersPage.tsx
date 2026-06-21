import { useListUsers, useUpdateUserRole } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const { toast } = useToast();

  const handleRoleChange = (id: number, role: string) => {
    updateRole.mutate({ id, data: { role: role as any } }, {
      onSuccess: () => {
        toast({ title: "Role updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      },
      onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message })
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">Manage system access and roles.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email / Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[200px]">Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5} className="py-4"><Skeleton className="h-6 w-full"/></TableCell></TableRow>)
            ) : users?.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-gray-900">{u.firstName} {u.lastName}</TableCell>
                <TableCell>{u.email || u.username}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                    u.role === 'manager' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select defaultValue={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}