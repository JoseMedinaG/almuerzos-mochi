import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTodayOrders } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, ClipboardList, FileText, Copy, Check, Banknote, Smartphone, ChevronDown, Loader2, Trash2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

export default function AdminOrders() {
  const today = new Date().toISOString().split('T')[0];
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [nequiWinner, setNequiWinner] = useState<string | null>(null);
  const [showNequiRaffle, setShowNequiRaffle] = useState(false);
  const [isRaffling, setIsRaffling] = useState(false);
  const queryClient = useQueryClient();

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
      const itemName = ((o.special as any)?.name || (o.protein as any)?.name || "Sin proteína").toLowerCase();
      const sideName = (o.side as any)?.name?.toLowerCase();
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

  const updatePaymentMethod = async (orderId: string, method: 'efectivo' | 'nequi') => {
    setUpdatingPayment(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ payment_method: method })
      .eq('id', orderId);
    if (error) {
      toast.error("Error al actualizar el medio de pago");
    } else {
      queryClient.invalidateQueries({ queryKey: ['adminOrders', menu?.id] });
    }
    setUpdatingPayment(null);
  };

  const deleteOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      toast.error("Error al eliminar el pedido");
    } else {
      toast.success("Pedido eliminado");
      queryClient.invalidateQueries({ queryKey: ['adminOrders', menu?.id] });
    }
    setDeletingOrderId(null);
  };

  const nequiOrders = orders?.filter(o => o.payment_method === 'nequi') || [];

  // Fetch previous raffle winner to exclude from next raffle
  const { data: previousWinner } = useQuery({
    queryKey: ['previousRaffleWinner'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'nequi_raffle_winner')
        .maybeSingle();
      return data?.value as { name: string } | null;
    },
  });

  const handleNequiRaffle = () => {
    if (!nequiOrders.length) return;
    setShowNequiRaffle(true);
    setIsRaffling(true);
    setNequiWinner(null);

    // If more than 1 Nequi payer, exclude previous winner
    let eligibleOrders = nequiOrders;
    if (nequiOrders.length > 1 && previousWinner?.name) {
      eligibleOrders = nequiOrders.filter(o => o.customer_name !== previousWinner.name);
      // If all filtered out (unlikely), fall back to all
      if (eligibleOrders.length === 0) eligibleOrders = nequiOrders;
    }

    // Animate through names for 2 seconds then pick winner
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * eligibleOrders.length);
      setNequiWinner(eligibleOrders[randomIdx].customer_name);
    }, 100);

    setTimeout(async () => {
      clearInterval(interval);
      const winnerIdx = Math.floor(Math.random() * eligibleOrders.length);
      const winner = eligibleOrders[winnerIdx].customer_name;
      setNequiWinner(winner);
      setIsRaffling(false);

      // Save winner to app_config so PublicOrdersView updates immediately
      const winnerOrder = eligibleOrders[winnerIdx];
      await supabase
        .from('app_config')
        .upsert({ key: 'nequi_raffle_winner', value: { name: winner, phone: winnerOrder.customer_phone } as any }, { onConflict: 'key' });
      queryClient.invalidateQueries({ queryKey: ['raffleWinner'] });
      queryClient.invalidateQueries({ queryKey: ['previousRaffleWinner'] });

      // Send push notification to inform Nequi payers
      try {
        await supabaseClient.functions.invoke("push-notifications", {
          body: {
            action: "notify",
            title: "Sorteo Nequi 🎲",
            body: `${winner} fue seleccionado(a) para recoger el pago Nequi de ${formatPrice(totalNequi)}.`,
          },
        });
      } catch {
        // Silent fail - notification is best-effort
      }
    }, 2000);
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalEfectivo = orders?.filter(o => o.payment_method === 'efectivo' || !o.payment_method).reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
  const totalNequi = orders?.filter(o => o.payment_method === 'nequi').reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

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
                {nequiOrders.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleNequiRaffle}
                    className="gap-2 self-center border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
                  >
                    <Shuffle className="h-4 w-4" /> Sorteo Nequi
                  </Button>
                )}
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
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(order => {
                        const paymentMethod = (order as any).payment_method || 'efectivo';
                        const isUpdating = updatingPayment === order.id;
                        return (
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="flex items-center gap-1 text-sm font-medium rounded px-2 py-1 hover:bg-muted transition-colors disabled:opacity-50"
                                    disabled={isUpdating}
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : paymentMethod === 'nequi' ? (
                                      <Smartphone className="h-3.5 w-3.5 text-purple-600" />
                                    ) : (
                                      <Banknote className="h-3.5 w-3.5 text-green-600" />
                                    )}
                                    <span className={paymentMethod === 'nequi' ? 'text-purple-600' : 'text-green-600'}>
                                      {paymentMethod === 'nequi' ? 'Nequi' : 'Efectivo'}
                                    </span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem
                                    onClick={() => updatePaymentMethod(order.id, 'efectivo')}
                                    className="gap-2"
                                  >
                                    <Banknote className="h-4 w-4 text-green-600" />
                                    <span>Efectivo</span>
                                    {paymentMethod === 'efectivo' && <Check className="h-3.5 w-3.5 ml-auto" />}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updatePaymentMethod(order.id, 'nequi')}
                                    className="gap-2"
                                  >
                                    <Smartphone className="h-4 w-4 text-purple-600" />
                                    <span>Nequi</span>
                                    {paymentMethod === 'nequi' && <Check className="h-3.5 w-3.5 ml-auto" />}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">{formatPrice(order.total_price)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingOrderId(order.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={showNequiRaffle} onOpenChange={setShowNequiRaffle}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Shuffle className="h-5 w-5 text-purple-600" /> Sorteo Nequi
            </DialogTitle>
            <DialogDescription>
              Persona seleccionada para recoger el pago Nequi ({formatPrice(totalNequi)})
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <p className={`text-3xl font-bold text-purple-600 transition-all ${isRaffling ? 'animate-pulse' : ''}`}>
              {nequiWinner || '...'}
            </p>
            {!isRaffling && nequiWinner && (
              <p className="text-sm text-muted-foreground mt-3">
                🎉 ¡{nequiWinner} recoge el Nequi hoy!
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNequiRaffle(false)} className="flex-1">
              Cerrar
            </Button>
            <Button onClick={handleNequiRaffle} disabled={isRaffling} className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700">
              <Shuffle className="h-4 w-4" /> Sortear de nuevo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingOrderId} onOpenChange={(open) => !open && setDeletingOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El pedido será eliminado permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingOrderId && deleteOrder(deletingOrderId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
