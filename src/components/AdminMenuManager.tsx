import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDailyMenu, addMenuItem, deleteMenuItem, getMenuItems } from "@/lib/supabase-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays } from "lucide-react";

export default function AdminMenuManager() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [greeting, setGreeting] = useState("Buenos días");
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<string>("proteina");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: menu, isLoading } = useQuery({
    queryKey: ['adminMenu', selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_menus')
        .select('*')
        .eq('date', selectedDate)
        .maybeSingle();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ['adminMenuItems', menu?.id],
    queryFn: () => getMenuItems(menu!.id),
    enabled: !!menu?.id,
  });

  const handleCreateMenu = async () => {
    setCreating(true);
    try {
      await createDailyMenu(selectedDate, greeting);
      queryClient.invalidateQueries({ queryKey: ['adminMenu', selectedDate] });
      toast.success("Menú creado");
    } catch (e: any) {
      toast.error(e.message || "Error creando menú");
    }
    setCreating(false);
  };

  const handleAddItem = async () => {
    if (!menu || !newItemName.trim()) return;
    try {
      await addMenuItem({
        menu_id: menu.id,
        type: newItemType as any,
        name: newItemName.trim(),
        price: newItemPrice ? parseInt(newItemPrice) : undefined,
      });
      setNewItemName("");
      setNewItemPrice("");
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems', menu.id] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', menu.id] });
      toast.success("Item agregado");
    } catch {
      toast.error("Error agregando item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!menu) return;
    try {
      await deleteMenuItem(id);
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems', menu.id] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', menu.id] });
      toast.success("Item eliminado");
    } catch {
      toast.error("Error eliminando item");
    }
  };

  const groupedItems = items?.reduce((acc, item) => {
    const key = item.type as string;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, typeof items>) || {};

  const typeLabels: Record<string, string> = {
    sopa: "🍲 Sopas",
    principio: "🥗 Principios",
    proteina: "🍖 Proteínas",
    especial: "⭐ Especiales",
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="space-y-6">
      {/* Date selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-sans flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Gestionar Menú
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Fecha</Label>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Saludo</Label>
              <Input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Buenos días" />
            </div>
          </div>
          {!menu && !isLoading && (
            <Button onClick={handleCreateMenu} disabled={creating} className="w-full">
              {creating ? "Creando..." : "Crear Menú para este día"}
            </Button>
          )}
          {menu && <p className="text-sm text-success font-medium">✓ Menú activo para {selectedDate}</p>}
        </CardContent>
      </Card>

      {/* Add items */}
      {menu && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Agregar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label>Tipo</Label>
                <Select value={newItemType} onValueChange={setNewItemType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sopa">Sopa</SelectItem>
                    <SelectItem value="principio">Principio</SelectItem>
                    <SelectItem value="proteina">Proteína</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2] min-w-[200px]">
                <Label>Nombre</Label>
                <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Pollo apanado" />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label>Precio (COP)</Label>
                <Input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="14000" />
              </div>
              <Button onClick={handleAddItem} disabled={!newItemName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current items */}
      {menu && Object.entries(groupedItems).map(([type, typeItems]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-sans">{typeLabels[type] || type}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {typeItems!.map(item => (
                <li key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    {item.price && <span className="text-primary font-semibold">{formatPrice(item.price)}</span>}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
