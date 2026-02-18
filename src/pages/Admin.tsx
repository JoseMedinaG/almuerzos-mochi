import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/supabase-helpers";
import AdminLogin from "./AdminLogin";
import AdminMenuManager from "@/components/AdminMenuManager";
import AdminOrders from "@/components/AdminOrders";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, UtensilsCrossed, ClipboardList, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['isAdmin', session?.user?.id],
    queryFn: checkIsAdmin,
    enabled: !!session?.user,
  });

  if (sessionLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold">No tienes permisos de administrador</p>
          <p className="text-muted-foreground">Contacta al administrador para obtener acceso.</p>
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); toast.info("Sesión cerrada"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Panel Admin
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2">
              <ShoppingBag className="h-4 w-4" /> Hacer pedido
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); toast.info("Sesión cerrada"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="menu">
          <TabsList className="mb-6">
            <TabsTrigger value="menu" className="gap-2"><UtensilsCrossed className="h-4 w-4" /> Menú</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><ClipboardList className="h-4 w-4" /> Pedidos</TabsTrigger>
          </TabsList>
          <TabsContent value="menu">
            <AdminMenuManager />
          </TabsContent>
          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
