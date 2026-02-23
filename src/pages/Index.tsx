import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTodayMenu, getMenuItems } from "@/lib/supabase-helpers";
import MenuDisplay from "@/components/MenuDisplay";
import OrderForm from "@/components/OrderForm";
import { Link } from "react-router-dom";
import { ShieldCheck, UtensilsCrossed, Bell } from "lucide-react";
import heroImage from "@/assets/hero-lunch.jpg";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [orderKey, setOrderKey] = useState(0);
  const { isSubscribed, isSupported, subscribe } = usePushNotifications();
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['todayMenu'],
    queryFn: getTodayMenu,
  });

  const { data: items } = useQuery({
    queryKey: ['menuItems', menu?.id],
    queryFn: () => getMenuItems(menu!.id),
    enabled: !!menu?.id,
  });

  const handleOrderPlaced = useCallback(() => setOrderKey(k => k + 1), []);

  if (menuLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando menú...</div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-background">
        <header className="relative h-64 overflow-hidden">
          <img src={heroImage} alt="Almuerzo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
            <div className="text-center">
              <UtensilsCrossed className="h-12 w-12 text-primary-foreground mx-auto mb-3" />
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">Pedidos de Almuerzo</h1>
            </div>
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-xl text-muted-foreground">No hay menú disponible para hoy.</p>
          <p className="text-muted-foreground mt-2">Vuelve más tarde cuando el administrador publique el menú del día.</p>
        </div>
        <footer className="fixed bottom-4 right-4">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Admin
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative h-56 md:h-72 overflow-hidden">
        <img src={heroImage} alt="Almuerzo colombiano" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
          <div className="text-center">
            <UtensilsCrossed className="h-10 w-10 text-primary-foreground mx-auto mb-2" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">Menú del Día</h1>
            <p className="text-primary-foreground/80 mt-1">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        {isSupported && !isSubscribed && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => subscribe()}
          >
            <Bell className="h-5 w-5" />
          </Button>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Menu */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Menú</h2>
            {items && <MenuDisplay greeting={menu.greeting || ''} items={items} />}
          </div>

          {/* Order Form */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Haz tu pedido</h2>
            {items && <OrderForm key={orderKey} menuId={menu.id} items={items} onOrderPlaced={handleOrderPlaced} />}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-4 right-4">
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Admin
        </Link>
      </footer>
    </div>
  );
};

export default Index;
