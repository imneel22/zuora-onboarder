import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  zuora_account_id: string;
  industry: string | null;
  status: string;
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card
            key={customer.id}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate(`/customer/${customer.id}`)}
          >
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {customer.zuora_account_id}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(customer.status)} variant="outline">
                    {customer.status}
                  </Badge>
                </div>

                {customer.industry && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Industry</span>
                    <span className="text-sm font-medium">{customer.industry}</span>
                  </div>
                )}

                {customer.go_live_target_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Target Date</span>
                    <span className="text-sm font-medium">
                      {new Date(customer.go_live_target_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
