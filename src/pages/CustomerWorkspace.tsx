import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WhatTheySell } from "@/components/workspace/WhatTheySell";
import { HowTheySell } from "@/components/workspace/HowTheySell";
import { CoverageSet } from "@/components/workspace/CoverageSet";
import { AuditTrail } from "@/components/workspace/AuditTrail";

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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(25);
  const navigate = useNavigate();

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
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
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

      <Tabs defaultValue="what-they-sell" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="what-they-sell">What They Sell</TabsTrigger>
          <TabsTrigger value="how-they-sell">How They Sell</TabsTrigger>
          <TabsTrigger value="coverage-set">Coverage Set</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="what-they-sell" className="space-y-4">
          <WhatTheySell customerId={customer.id} />
        </TabsContent>

        <TabsContent value="how-they-sell" className="space-y-4">
          <HowTheySell customerId={customer.id} />
        </TabsContent>

        <TabsContent value="coverage-set" className="space-y-4">
          <CoverageSet customerId={customer.id} />
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <AuditTrail customerId={customer.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerWorkspace;
