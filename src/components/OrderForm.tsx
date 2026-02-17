import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createOrder } from "@/lib/supabase-helpers";
import { toast } from "sonner";
import { UtensilsCrossed, Soup, Salad, Star, Send } from "lucide-react";

interface MenuItem {
  id: string;
  type: string;
  name: string;
  price: number | null;
}

interface OrderFormProps {
  menuId: string;
  items: MenuItem[];
  onOrderPlaced: () => void;
}

export default function OrderForm({ menuId, items, onOrderPlaced }: OrderFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedProtein, setSelectedProtein] = useState("");
  const [selectedSide, setSelectedSide] = useState("");
  const [wantsSoup, setWantsSoup] = useState(false);
  const [selectedSoup, setSelectedSoup] = useState("");
  const [wantsSalad, setWantsSalad] = useState(false);
  const [selectedSpecial, setSelectedSpecial] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const proteins = useMemo(() => items.filter(i => i.type === "proteina"), [items]);
  const sides = useMemo(() => items.filter(i => i.type === "principio"), [items]);
  const soups = useMemo(() => items.filter(i => i.type === "sopa"), [items]);
  const specials = useMemo(() => items.filter(i => i.type === "especial"), [items]);

  const totalPrice = useMemo(() => {
    if (selectedSpecial) {
      const special = specials.find(s => s.id === selectedSpecial);
      return special?.price || 0;
    }
    const protein = proteins.find(p => p.id === selectedProtein);
    return protein?.price || 0;
  }, [selectedProtein, selectedSpecial, proteins, specials]);

  const isSpecialOrder = !!selectedSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    if (!selectedProtein && !selectedSpecial) {
      toast.error("Selecciona una proteína o un especial");
      return;
    }

    setSubmitting(true);
    try {
      await createOrder({
        menu_id: menuId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        protein_id: isSpecialOrder ? undefined : selectedProtein || undefined,
        side_id: isSpecialOrder ? undefined : selectedSide || undefined,
        wants_soup: isSpecialOrder ? false : wantsSoup,
        soup_id: isSpecialOrder ? undefined : (wantsSoup ? selectedSoup || undefined : undefined),
        wants_salad: isSpecialOrder ? false : wantsSalad,
        special_id: selectedSpecial || undefined,
        notes: notes.trim() || undefined,
        total_price: totalPrice,
      });
      toast.success("¡Pedido realizado con éxito!");
      setCustomerName("");
      setCustomerPhone("");
      setSelectedProtein("");
      setSelectedSide("");
      setWantsSoup(false);
      setSelectedSoup("");
      setWantsSalad(false);
      setSelectedSpecial("");
      setNotes("");
      onOrderPlaced();
    } catch {
      toast.error("Error al realizar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-sans font-semibold">Tu información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="300 123 4567" />
          </div>
        </CardContent>
      </Card>

      {/* Specials */}
      {specials.length > 0 && (
        <Card className={isSpecialOrder ? "ring-2 ring-primary" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-warm-gold" />
              Especiales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedSpecial} onValueChange={(val) => {
              setSelectedSpecial(val);
              if (val) { setSelectedProtein(""); setSelectedSide(""); setWantsSoup(false); setWantsSalad(false); }
            }}>
              {specials.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={item.id} id={`special-${item.id}`} />
                    <Label htmlFor={`special-${item.id}`} className="cursor-pointer font-medium">{item.name}</Label>
                  </div>
                  <span className="text-primary font-bold">{item.price ? formatPrice(item.price) : ''}</span>
                </div>
              ))}
              {selectedSpecial && (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setSelectedSpecial("")}>
                  Quitar especial
                </Button>
              )}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Regular menu */}
      {!isSpecialOrder && (
        <>
          {/* Proteins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                Proteína *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedProtein} onValueChange={setSelectedProtein}>
                {proteins.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={item.id} id={`protein-${item.id}`} />
                      <Label htmlFor={`protein-${item.id}`} className="cursor-pointer font-medium">{item.name}</Label>
                    </div>
                    <span className="text-primary font-bold">{item.price ? formatPrice(item.price) : ''}</span>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Sides */}
          {sides.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
                  <Salad className="h-5 w-5 text-accent" />
                  Principio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedSide} onValueChange={setSelectedSide}>
                  {sides.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={item.id} id={`side-${item.id}`} />
                        <Label htmlFor={`side-${item.id}`} className="cursor-pointer font-medium">{item.name}</Label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Soup */}
          {soups.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
                  <Soup className="h-5 w-5 text-warm-gold" />
                  Sopa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox id="wants-soup" checked={wantsSoup} onCheckedChange={(c) => { setWantsSoup(!!c); if (!c) setSelectedSoup(""); }} />
                  <Label htmlFor="wants-soup" className="cursor-pointer">¿Deseas sopa?</Label>
                </div>
                {wantsSoup && (
                  <RadioGroup value={selectedSoup} onValueChange={setSelectedSoup}>
                    {soups.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-1 px-3">
                        <RadioGroupItem value={item.id} id={`soup-${item.id}`} />
                        <Label htmlFor={`soup-${item.id}`} className="cursor-pointer">{item.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          )}

          {/* Salad */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Checkbox id="wants-salad" checked={wantsSalad} onCheckedChange={(c) => setWantsSalad(!!c)} />
                <Label htmlFor="wants-salad" className="cursor-pointer font-medium">¿Deseas ensalada?</Label>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="notes">Notas adicionales</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sin cebolla, doble arroz..." className="mt-2" />
        </CardContent>
      </Card>

      {/* Total & Submit */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary font-serif">{formatPrice(totalPrice)}</p>
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="gap-2">
            <Send className="h-4 w-4" />
            {submitting ? "Enviando..." : "Hacer Pedido"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
