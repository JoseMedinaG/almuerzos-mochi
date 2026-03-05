import { useQuery } from "@tanstack/react-query";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Badge } from "@/components/ui/badge";

interface PublicOrdersViewProps {
  menuId: string;
}

export default function PublicOrdersView({ menuId }: PublicOrdersViewProps) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['publicOrders', menuId],
    queryFn: () => getTodayOrders(menuId),
    refetchInterval: 15000,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  if (isLoading) return <p className="text-center text-muted-foreground py-4">Cargando pedidos...</p>;
  if (!orders?.length) return <p className="text-center text-muted-foreground py-4">No hay pedidos aún.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{orders.length} pedido(s) hoy</p>
      <div className="space-y-3">
        {orders.map((order: any) => {
          const items: string[] = [];
          if (order.special) {
            items.push(`🍽️ Especial: ${order.special.name}`);
          } else {
            if (order.protein?.name) items.push(`🥩 ${order.protein.name}`);
            if (order.side?.name) items.push(`🍚 ${order.side.name}`);
            if (order.wants_salad) items.push('🥗 Ensalada');
          }
          if (order.soup?.name) items.push(`🍲 ${order.soup.name}`);

          return (
            <div key={order.id} className="rounded-lg border bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{order.customer_name}</span>
                <Badge variant={order.payment_method === 'nequi' ? 'default' : 'secondary'}>
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
              {order.customer_phone && (
                <p className="text-xs text-muted-foreground">📱 {order.customer_phone}</p>
              )}
              <p className="text-right font-semibold text-foreground">{formatPrice(order.total_price)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
