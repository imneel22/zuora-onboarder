import { Building2, Settings, Users, Package, ShoppingCart, CheckSquare, Shield, FileText, ArrowLeft } from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Taxonomy", url: "/admin/taxonomy", icon: Settings },
  { title: "Users", url: "/admin/users", icon: Users },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState<string>("");

  const isCustomerWorkspace = location.pathname.startsWith("/customer/");
  
  // Extract customerId from pathname instead of useParams
  const customerId = isCustomerWorkspace 
    ? location.pathname.split("/customer/")[1]?.split("?")[0]
    : null;

  useEffect(() => {
    if (customerId) {
      fetchCustomerName();
    }
  }, [customerId]);

  const fetchCustomerName = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .maybeSingle();
    
    if (data) {
      setCustomerName(data.name);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "what-they-sell";

  const workspaceItems = customerId ? [
    { title: "What They Sell", tab: "what-they-sell", icon: Package },
    { title: "How They Sell", tab: "how-they-sell", icon: ShoppingCart },
    { title: "Use Cases", tab: "use-cases", icon: CheckSquare },
  ] : [];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Revenue</span>
            <span className="text-xs text-muted-foreground">Implementation</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isCustomerWorkspace ? (
          <>
            <div className="p-4 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="w-full justify-start"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Button>
              {customerName && (
                <div className="mt-2 px-2">
                  <p className="text-sm font-medium truncate">{customerName}</p>
                  <p className="text-xs text-muted-foreground">Workspace</p>
                </div>
              )}
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceItems.map((item) => {
                    const isActive = currentTab === item.tab;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <a
                            href={`/customer/${customerId}?tab=${item.tab}`}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/customer/${customerId}?tab=${item.tab}`);
                            }}
                            className={isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/"
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Customers</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
