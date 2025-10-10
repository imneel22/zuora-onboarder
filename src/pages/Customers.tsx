import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load customers");
      console.error(error);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.zuora_account_id.toLowerCase().includes(search.toLowerCase()) ||
    customer.industry?.toLowerCase().includes(search.toLowerCase())
  );

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
      complete: 100,
    };
    return phaseMap[phase] || 0;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage revenue implementation projects
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Zuora Account ID</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow
                key={customer.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/customer/${customer.id}`)}
              >
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{customer.name}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={getPhaseProgress(customer.phase)} className="h-1.5 w-32" />
                      <span className="text-xs text-muted-foreground capitalize">{customer.phase}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{customer.zuora_account_id}</TableCell>
                <TableCell>{customer.industry || "-"}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(customer.status)} variant="outline">
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {customer.go_live_target_date
                    ? new Date(customer.go_live_target_date).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customer/${customer.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg text-muted-foreground">No customers found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or add a new customer
          </p>
        </div>
      )}
    </div>
  );
};

export default Customers;
