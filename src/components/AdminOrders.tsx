import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ClipboardList } from "lucide-react";

export default function AdminOrders() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: menu } = useQuery({
    queryKey: ['adminOrderMenu', selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_menus')
        .select('*')
        .eq('date', selectedDate)
        .maybeSingle();
      return data;
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['adminOrders', menu?.id],
    queryFn: () => getTodayOrders(menu!.id),
    enabled: !!menu?.id,
    refetchInterval: 15000,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  const exportCSV = () => {
    if (!orders?.length) return;
    const headers = ['Nombre', 'Teléfono', 'Proteína', 'Principio', 'Sopa', 'Ensalada', 'Especial', 'Notas', 'Total', 'Hora'];
    const rows = orders.map(o => [
      o.customer_name,
      o.customer_phone || '',
      (o.protein as any)?.name || '',
      (o.side as any)?.name || '',
      o.wants_soup ? ((o.soup as any)?.name || 'Sí') : 'No',
      o.wants_salad ? 'Sí' : 'No',
      (o.special as any)?.name || '',
      o.notes || '',
      o.total_price,
      new Date(o.created_at).toLocaleTimeString('es-CO'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-sans flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Pedidos del día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={exportCSV} disabled={!orders?.length} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>

          {!menu && <p className="text-muted-foreground">No hay menú para esta fecha.</p>}

          {menu && (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <div className="bg-primary/10 rounded-lg px-4 py-2">
                  <p className="text-muted-foreground">Total pedidos</p>
                  <p className="text-2xl font-bold text-primary">{orders?.length || 0}</p>
                </div>
                <div className="bg-accent/10 rounded-lg px-4 py-2">
                  <p className="text-muted-foreground">Total ventas</p>
                  <p className="text-2xl font-bold text-accent">{formatPrice(totalRevenue)}</p>
                </div>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground animate-pulse">Cargando pedidos...</p>
              ) : !orders?.length ? (
                <p className="text-muted-foreground">No hay pedidos aún.</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Proteína / Especial</TableHead>
                        <TableHead>Principio</TableHead>
                        <TableHead>Sopa</TableHead>
                        <TableHead>Ensalada</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.customer_name}
                            {order.customer_phone && <span className="block text-xs text-muted-foreground">{order.customer_phone}</span>}
                          </TableCell>
                          <TableCell>
                            {(order.special as any)?.name
                              ? <span className="text-warm-gold font-medium">⭐ {(order.special as any).name}</span>
                              : (order.protein as any)?.name || '-'}
                          </TableCell>
                          <TableCell>{(order.side as any)?.name || '-'}</TableCell>
                          <TableCell>{order.wants_soup ? ((order.soup as any)?.name || 'Sí') : 'No'}</TableCell>
                          <TableCell>{order.wants_salad ? 'Sí' : 'No'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{order.notes || '-'}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">{formatPrice(order.total_price)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
