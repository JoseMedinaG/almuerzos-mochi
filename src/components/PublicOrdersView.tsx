import { useQuery } from "@tanstack/react-query";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Truck } from "lucide-react";

interface PublicOrdersViewProps {
  menuId: string;
}

export default function PublicOrdersView({ menuId }: PublicOrdersViewProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['publicOrders', menuId],
    queryFn: () => getTodayOrders(menuId),
    refetchInterval: 15000,
  });

  const { data: raffleWinner } = useQuery({
    queryKey: ['raffleWinner'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'nequi_raffle_winner')
        .maybeSingle();
      const val = data?.value as { name: string; phone?: string; date?: string } | null;
      const today = new Date().toISOString().split('T')[0];
      if (val && val.date && val.date !== today) return null;
      return val;
    },
    refetchInterval: 15000,
  });

  const { data: pickupWinners } = useQuery({
    queryKey: ['pickupWinners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'pickup_winners')
        .maybeSingle();
      const val = data?.value as { names: string[]; date?: string } | null;
      const today = new Date().toISOString().split('T')[0];
      if (val && val.date && val.date !== today) return null;
      return val;
    },
    refetchInterval: 15000,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  if (isLoading) return <p className="text-center text-muted-foreground py-4">Cargando pedidos...</p>;
  if (!orders?.length) return <p className="text-center text-muted-foreground py-4">No hay pedidos aún.</p>;

  return (
    <div className="space-y-3">
      {raffleWinner?.name && (() => {
        const nequiTotal = orders
          .filter((o: any) => o.payment_method === 'nequi')
          .reduce((sum: number, o: any) => sum + o.total_price, 0);
        return (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm border bg-primary/10 border-primary/30">
            <Trophy className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-primary">
              <span className="font-semibold">Sorteo Nequi:</span> Hoy paga <span className="font-bold text-foreground">{raffleWinner.name}</span>
              {raffleWinner.phone && <span className="block text-xs mt-0.5 opacity-90">📱 {raffleWinner.phone}</span>}
              <span className="block font-semibold mt-0.5">{formatPrice(nequiTotal)} 🎉</span>
            </p>
          </div>
        );
      })()}
      {pickupWinners?.names && pickupWinners.names.length > 0 && (() => {
        const cashTotal = orders
          .filter((o: any) => o.payment_method === 'efectivo')
          .reduce((sum: number, o: any) => sum + o.total_price, 0);
        return (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm border bg-primary/10 border-primary/30">
            <Truck className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-primary">
              <span className="font-semibold">Encargado{pickupWinners.names.length > 1 ? 's' : ''} de recoger:</span>{' '}
              <span className="font-bold text-foreground">{pickupWinners.names.join(' y ')}</span> 🛵
              <span className="block font-semibold mt-0.5">A recoger en efectivo: {formatPrice(cashTotal)} 💵</span>
            </p>
          </div>
        );
      })()}
      <p className="text-sm text-muted-foreground">{orders.length} pedido(s) hoy</p>
      <div className="space-y-3">
        {orders.map((order: any) => {
          const items: string[] = [];
          if (order.special) {
            items.push(`🍽️ Especial: ${order.special.name}`);
          } else {
            items.push(order.protein?.name ? `🥩 ${order.protein.name}` : '🥩 Sin proteína');
            items.push(order.side?.name ? `🍚 ${order.side.name}` : '🍚 Sin principio');
            items.push(order.wants_salad ? '🥗 Con ensalada' : '🥗 Sin ensalada');
          }
          items.push(order.soup?.name ? `🍲 ${order.soup.name}` : '🍲 Sin sopa');

          return (
            <div key={order.id} className="rounded-lg border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{order.customer_name}</span>
                <Badge
                  className="text-white border-transparent"
                  style={{
                    backgroundColor: order.payment_method === 'nequi' ? '#C8007C' : '#22c55e',
                  }}
                >
                  {order.payment_method === 'nequi' ? 'Nequi' : 'Efectivo'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {items.map((item, i) => (
                  <p key={i}>{item}</p>
                ))}
              </div>
              {order.notes && (
                <p className="text-xs text-muted-foreground italic">📝 {order.notes}</p>
              )}
              {order.payment_method === 'nequi' && order.customer_phone && (
                <p className="text-xs text-muted-foreground">📱 Nequi: {order.customer_phone}</p>
              )}
              <p className="text-right font-semibold text-foreground">{formatPrice(order.total_price)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
