import { useQuery } from "@tanstack/react-query";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: any) => {
              const description = order.special
                ? order.special.name
                : [
                    order.protein?.name,
                    order.side?.name,
                    order.wants_salad && 'Ensalada',
                    order.soup?.name,
                  ].filter(Boolean).join(', ');

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.customer_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{description}</TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(order.total_price)}</TableCell>
                  <TableCell>
                    <Badge variant={order.payment_method === 'nequi' ? 'default' : 'secondary'}>
                      {order.payment_method === 'nequi' ? 'Nequi' : 'Efectivo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
