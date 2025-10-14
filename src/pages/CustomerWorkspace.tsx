import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WhatTheySell } from "@/components/workspace/WhatTheySell";
import { HowTheySell } from "@/components/workspace/HowTheySell";
import { UseCaseList } from "@/components/workspace/UseCaseList";

interface Customer {
  id: string;
  name: string;
  zuora_account_id: string;
  status: string;
  industry: string | null;
  go_live_target_date: string | null;
}

const CustomerWorkspace = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(25);
  const navigate = useNavigate();
  
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "how-they-sell" 
    ? "how-they-sell" 
    : tabParam === "use-cases" 
    ? "use-case-list"
    : tabParam === "coverage"
    ? "coverage"
    : tabParam === "audit"
    ? "audit"
    : "what-they-sell";

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error) {
      toast.error("Failed to load customer");
      console.error(error);
    } else {
      setCustomer(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <p className="text-lg text-muted-foreground">Customer not found</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Account: {customer.zuora_account_id}</span>
            {customer.industry && <span>• {customer.industry}</span>}
          </div>
        </div>
        <Badge className={getStatusColor(customer.status)} variant="outline">
          {customer.status}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Implementation Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {activeTab === "what-they-sell" && <WhatTheySell customerId={customer.id} />}
      {activeTab === "how-they-sell" && <HowTheySell customerId={customer.id} />}
      {activeTab === "use-case-list" && <UseCaseList customerId={customer.id} />}
      {activeTab === "coverage" && (
        <div className="text-center text-muted-foreground py-12">Coverage Set - Coming Soon</div>
      )}
      {activeTab === "audit" && (
        <div className="text-center text-muted-foreground py-12">Audit Trail - Coming Soon</div>
      )}
    </div>
  );
};

export default CustomerWorkspace;
