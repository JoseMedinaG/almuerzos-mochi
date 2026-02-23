import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDailyMenu, addMenuItem, deleteMenuItem, getMenuItems } from "@/lib/supabase-helpers";
import { parseMenuText } from "@/lib/menu-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, CalendarDays, Upload, Plus, Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendMenuNotification } from "@/hooks/usePushNotifications";

const SAMPLE_MENU = `BUENOS DIAS

MENU
SOPA CONCHAS
PRINCIPIO arveja o ensalada rusa
PROTEÍNAS
albondigas. $14000
pollo apanado. $14000
pollo sudado $14000
pechuga plancha. $14000
carne plancha $14000
lomo BBQ. $14000
carne sudada. $14000
hígado bistec $14000
ESPECIALES
Arroz pollo 16000
Sobre barriga. $19000
Róbalo. 18000
Mojarra. $19000`;

export default function AdminMenuManager() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [menuText, setMenuText] = useState("");
  const [importing, setImporting] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<string>("proteina");
  const [newItemPrice, setNewItemPrice] = useState("");

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

  const handleBulkImport = async () => {
    if (!menuText.trim()) {
      toast.error("Pega el menú del día en el campo de texto");
      return;
    }

    setImporting(true);
    try {
      const parsed = parseMenuText(menuText);

      if (parsed.items.length === 0) {
        toast.error("No se encontraron items en el texto");
        setImporting(false);
        return;
      }

      // Create or reuse menu
      let menuId = menu?.id;
      if (!menuId) {
        const newMenu = await createDailyMenu(selectedDate, parsed.greeting);
        menuId = newMenu.id;
      }

      // Delete existing items if menu already existed
      if (menu?.id && items?.length) {
        for (const item of items) {
          await deleteMenuItem(item.id);
        }
      }

      // Insert all parsed items
      for (const item of parsed.items) {
        await addMenuItem({
          menu_id: menuId,
          type: item.type,
          name: item.name,
          price: item.price,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['adminMenu', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems'] });
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success(`Menú importado: ${parsed.items.length} items`);
      setMenuText("");

      // Send push notification to all subscribers
      try {
        const sent = await sendMenuNotification();
        if (sent) {
          toast.success("Notificación enviada a los suscriptores 🔔");
        }
      } catch {
        // Silent fail - notification is optional
      }
    } catch (e: any) {
      toast.error(e.message || "Error importando menú");
    }
    setImporting(false);
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
      {/* Date + Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-sans flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Cargar Menú del Día
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>

          <div>
            <Label>Pegar menú completo</Label>
            <Textarea
              value={menuText}
              onChange={e => setMenuText(e.target.value)}
              placeholder={SAMPLE_MENU}
              className="min-h-[250px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pega el menú tal como lo recibes. Se detectarán automáticamente las sopas, principios, proteínas y especiales con sus precios.
            </p>
          </div>

          <Button onClick={handleBulkImport} disabled={importing || !menuText.trim()} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Importando..." : menu ? "Reemplazar menú" : "Crear menú"}
          </Button>

          {menu && <p className="text-sm text-success font-medium">✓ Menú activo para {selectedDate}</p>}
        </CardContent>
      </Card>

      {/* Add single item */}
      {menu && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Agregar Item Individual</CardTitle>
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
