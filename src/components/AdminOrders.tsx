import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, ClipboardList, FileText, Copy, Check, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrders() {
  const today = new Date().toISOString().split('T')[0];
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [copied, setCopied] = useState(false);
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
    const headers = ['Nombre', 'Teléfono', 'Proteína', 'Principio', 'Sopa', 'Ensalada', 'Especial', 'Notas', 'Pago', 'Total', 'Hora'];
    const rows = orders.map(o => [
      o.customer_name,
      o.customer_phone || '',
      (o.protein as any)?.name || '',
      (o.side as any)?.name || '',
      o.wants_soup ? ((o.soup as any)?.name || 'Sí') : 'No',
      o.wants_salad ? 'Sí' : 'No',
      (o.special as any)?.name || '',
      o.notes || '',
      (o as any).payment_method || 'efectivo',
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

  const generateOrderSummary = () => {
    if (!orders?.length) return "";
    const lines: Record<string, number> = {};
    let totalSoups = 0;

    for (const o of orders) {
      const isSpecial = !!(o.special as any)?.name;
      const itemName = (o.special as any)?.name || (o.protein as any)?.name || "Sin proteína";
      const sideName = (o.side as any)?.name;
      const sideText = sideName ? `con ${sideName}` : "sin principio";
      
      let extras: string[] = [];
      if (!isSpecial && o.wants_salad === false) extras.push("sin ensalada");
      if (o.notes) extras.push(o.notes);

      let line = `${itemName} ${isSpecial ? '' : sideText}`.trim();
      if (extras.length) line += ` ${extras.join(', ')}`;

      lines[line] = (lines[line] || 0) + 1;
      if (o.wants_soup) totalSoups++;
    }

    const result = Object.entries(lines)
      .map(([desc, qty]) => `${qty} ${desc}`)
      .join('\n');

    return totalSoups > 0 ? `${result}\n\n${totalSoups} Sopa` : result;
  };

  const handleCopySummary = async () => {
    const text = generateOrderSummary();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Pedido copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalEfectivo = orders?.filter(o => (o as any).payment_method === 'efectivo' || !(o as any).payment_method).reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalNequi = orders?.filter(o => (o as any).payment_method === 'nequi').reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-sans flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Pedidos del día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-4">
            <div className="min-w-[150px]">
              <Label>Fecha</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={exportCSV} disabled={!orders?.length} className="gap-2 flex-1 sm:flex-auto text-xs sm:text-sm">
                <Download className="h-4 w-4 shrink-0" /> CSV
              </Button>
              <Button onClick={() => setShowOrderSummary(true)} disabled={!orders?.length} className="gap-2 flex-1 sm:flex-auto text-xs sm:text-sm">
                <FileText className="h-4 w-4 shrink-0" /> Generar Pedido
              </Button>
            </div>
          </div>

          <Dialog open={showOrderSummary} onOpenChange={setShowOrderSummary}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Pedido del día - {selectedDate}</DialogTitle>
                <DialogDescription>Resumen listo para copiar</DialogDescription>
              </DialogHeader>
              <pre className="whitespace-pre-wrap text-sm bg-secondary/30 rounded-lg p-4 max-h-[400px] overflow-y-auto font-sans">
                {generateOrderSummary() || "No hay pedidos"}
              </pre>
              <Button onClick={handleCopySummary} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "¡Copiado!" : "Copiar al portapapeles"}
              </Button>
            </DialogContent>
          </Dialog>

          {!menu && <p className="text-muted-foreground">No hay menú para esta fecha.</p>}

          {menu && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm flex-wrap">
                <div className="bg-primary/10 rounded-lg px-4 py-2">
                  <p className="text-muted-foreground">Total pedidos</p>
                  <p className="text-2xl font-bold text-primary">{orders?.length || 0}</p>
                </div>
                <div className="bg-accent/10 rounded-lg px-4 py-2">
                  <p className="text-muted-foreground">Total ventas</p>
                  <p className="text-2xl font-bold text-accent">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="bg-green-500/10 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-muted-foreground">Efectivo</p>
                    <p className="text-xl font-bold text-green-600">{formatPrice(totalEfectivo)}</p>
                  </div>
                </div>
                <div className="bg-purple-500/10 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-muted-foreground">Nequi</p>
                    <p className="text-xl font-bold text-purple-600">{formatPrice(totalNequi)}</p>
                  </div>
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
                        <TableHead>Pago</TableHead>
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
                          <TableCell>
                            {(order as any).payment_method === 'nequi'
                              ? <span className="flex items-center gap-1 text-purple-600 font-medium"><Smartphone className="h-3.5 w-3.5" /> Nequi</span>
                              : <span className="flex items-center gap-1 text-green-600 font-medium"><Banknote className="h-3.5 w-3.5" /> Efectivo</span>
                            }
                          </TableCell>
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
