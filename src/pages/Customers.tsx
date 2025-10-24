import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, User, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  zuora_account_id: string;
  industry: string | null;
  status: string;
  phase: string;
  go_live_target_date: string | null;
  assigned_user_ids: string[];
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
}
const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserRole, setSelectedUserRole] = useState<string>("admin");
  const [formData, setFormData] = useState({
    name: "",
    zuora_account_id: "",
    industry: "",
    status: "active",
    phase: "discovery",
    go_live_target_date: ""
  });
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    fetchUsers();
    fetchCustomers();
  }, []);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email");

    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      toast.error("Failed to load users");
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Failed to fetch roles:", rolesError);
    }

    const rolesMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));
    
    const usersWithRoles = (profilesData || []).map((user: any) => ({
      id: user.id,
      full_name: user.full_name || user.email,
      email: user.email,
      role: rolesMap.get(user.id) || "standard"
    }));

    setUsers(usersWithRoles);
    
    // Set first user as default
    if (usersWithRoles.length > 0) {
      setSelectedUserId(usersWithRoles[0].id);
      setSelectedUserRole(usersWithRoles[0].role);
    }
  };
  const fetchCustomers = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("customers").select("*").order("name");
    if (error) {
      toast.error("Failed to load customers");
      console.error(error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };
  // Filter by role and assignment
  const roleFilteredCustomers = selectedUserRole === "admin"
    ? customers
    : customers.filter(customer => 
        customer.assigned_user_ids && customer.assigned_user_ids.includes(selectedUserId)
      );

  // Then filter by search
  const filteredCustomers = roleFilteredCustomers.filter(customer => 
    customer.name.toLowerCase().includes(search.toLowerCase()) || 
    customer.zuora_account_id.toLowerCase().includes(search.toLowerCase()) || 
    customer.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUserRole(user.role);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "onboarding":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-accent/10 text-accent border-accent/20";
      case "paused":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getPhaseProgress = (phase: string) => {
    const phaseMap: Record<string, number> = {
      discovery: 17,
      design: 33,
      build: 50,
      test: 67,
      deploy: 83,
      complete: 100
    };
    return phaseMap[phase] || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.zuora_account_id) {
      toast.error("Please fill in required fields");
      return;
    }

    const { error } = await supabase.from("customers").insert([{
      name: formData.name,
      zuora_account_id: formData.zuora_account_id,
      industry: formData.industry || null,
      status: formData.status,
      phase: formData.phase,
      go_live_target_date: formData.go_live_target_date || null,
      assigned_user_ids: assignedUsers
    }]);

    if (error) {
      toast.error("Failed to create customer");
      console.error(error);
    } else {
      toast.success("Customer created successfully");
      setDialogOpen(false);
      setFormData({
        name: "",
        zuora_account_id: "",
        industry: "",
        status: "active",
        phase: "discovery",
        go_live_target_date: ""
      });
      setAssignedUsers([]);
      fetchCustomers();
    }
  };

  const handleEditCustomer = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setAssignedUsers(customer.assigned_user_ids || []);
    setEditDialogOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCustomer) return;

    const { error } = await supabase
      .from("customers")
      .update({ assigned_user_ids: assignedUsers })
      .eq("id", editingCustomer.id);

    if (error) {
      toast.error("Failed to update customer");
      console.error(error);
    } else {
      toast.success("Customer updated successfully");
      setEditDialogOpen(false);
      setEditingCustomer(null);
      setAssignedUsers([]);
      fetchCustomers();
    }
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage revenue implementation projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedUserId} onValueChange={handleUserChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select user view" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} - {user.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Customer
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zuora_account_id">Zuora Tenant ID *</Label>
                <Input
                  id="zuora_account_id"
                  value={formData.zuora_account_id}
                  onChange={(e) => setFormData({ ...formData, zuora_account_id: e.target.value })}
                  placeholder="e.g., 1234567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., Technology"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovery">Discovery</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="deploy">Deploy</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="go_live_target_date">Target Go-Live Date</Label>
                <Input
                  id="go_live_target_date"
                  type="date"
                  value={formData.go_live_target_date}
                  onChange={(e) => setFormData({ ...formData, go_live_target_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Users</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assign-${user.id}`}
                        checked={assignedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserAssignment(user.id)}
                      />
                      <label
                        htmlFor={`assign-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.full_name} ({user.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">Create Customer</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Users to {editingCustomer?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned Users</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-assign-${user.id}`}
                        checked={assignedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserAssignment(user.id)}
                      />
                      <label
                        htmlFor={`edit-assign-${user.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {user.full_name} ({user.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">Update Assignments</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Zuora Tenant ID</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Users</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map(customer => <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customer/${customer.id}`)}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{customer.name}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={getPhaseProgress(customer.phase)} className="h-1.5 w-32" />
                      <span className="text-xs text-muted-foreground capitalize">{customer.phase}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{customer.zuora_account_id.padStart(7, '0')}</TableCell>
                <TableCell>{customer.industry || "-"}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(customer.status)} variant="outline">
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {customer.assigned_user_ids && customer.assigned_user_ids.length > 0 ? (
                      customer.assigned_user_ids.map(userId => {
                        const user = users.find(u => u.id === userId);
                        return user ? (
                          <Badge key={userId} variant="secondary" className="text-xs">
                            {user.full_name}
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {customer.go_live_target_date ? new Date(customer.go_live_target_date).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {selectedUserRole === "admin" && (
                      <Button variant="ghost" size="sm" onClick={(e) => handleEditCustomer(customer, e)}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={e => {
                      e.stopPropagation();
                      navigate(`/customer/${customer.id}`);
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </div>

      {filteredCustomers.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg text-muted-foreground">No customers found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or add a new customer
          </p>
        </div>}
    </div>;
};
export default Customers;