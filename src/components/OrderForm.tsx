import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createOrder } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UtensilsCrossed, Soup, Salad, Star, Send, Banknote, Smartphone } from "lucide-react";

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
  const [selectedSide, setSelectedSide] = useState("none");
  const [selectedSoup, setSelectedSoup] = useState("none");
  const [wantsSalad, setWantsSalad] = useState(true);
  const [selectedSpecial, setSelectedSpecial] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "nequi">("efectivo");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");

  const normalizeName = (n: string) => n.toLowerCase().replace(/\s+/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  useEffect(() => {
    let active = true;
    supabase.from("orders").select("customer_name").eq("menu_id", menuId).then(({ data }) => {
      if (active && data) setExistingNames(data.map((o: any) => normalizeName(o.customer_name)));
    });
    return () => { active = false; };
  }, [menuId]);

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
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(customerName.trim())) {
      toast.error("El nombre solo puede contener letras");
      return;
    }
    if (nameError || existingNames.includes(normalizeName(customerName))) {
      toast.error("Ya existe un pedido con ese nombre. Usa un nombre diferente.");
      return;
    }
    if (!selectedProtein && !selectedSpecial) {
      toast.error("Selecciona una proteína o un especial");
      return;
    }
    if (paymentMethod === "nequi" && !customerPhone.trim()) {
      toast.error("Para pago por Nequi debes ingresar tu número de teléfono");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      await createOrder({
        menu_id: menuId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        protein_id: isSpecialOrder ? undefined : selectedProtein || undefined,
        side_id: isSpecialOrder ? undefined : (selectedSide !== "none" ? selectedSide : undefined),
        wants_soup: selectedSoup !== "none",
        soup_id: selectedSoup !== "none" ? selectedSoup : undefined,
        wants_salad: isSpecialOrder ? false : wantsSalad,
        special_id: selectedSpecial || undefined,
        notes: notes.trim() || undefined,
        total_price: totalPrice,
        payment_method: paymentMethod,
      });
      toast.success("¡Pedido realizado con éxito!");
      setCustomerName("");
      setCustomerPhone("");
      setSelectedProtein("");
      setSelectedSide("none");
      setSelectedSoup("none");
      setWantsSalad(false);
      setSelectedSpecial("");
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
            <Input
              id="name"
              value={customerName}
              onChange={e => {
                const onlyLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
                setCustomerName(onlyLetters);
              }}
              placeholder="Tu nombre"
            />
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
              if (val) { setSelectedProtein(""); setSelectedSide("none"); setWantsSalad(false); }
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
      {/* Soup - available for both regular and special orders */}
      {soups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
              <Soup className="h-5 w-5 text-warm-gold" />
              Sopa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedSoup} onValueChange={setSelectedSoup}>
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                <RadioGroupItem value="none" id="soup-none" />
                <Label htmlFor="soup-none" className="cursor-pointer font-medium text-muted-foreground">Sin sopa</Label>
              </div>
              {soups.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={item.id} id={`soup-${item.id}`} />
                  <Label htmlFor={`soup-${item.id}`} className="cursor-pointer font-medium">{item.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

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
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="none" id="side-none" />
                  <Label htmlFor="side-none" className="cursor-pointer font-medium text-muted-foreground">Sin principio</Label>
                </div>
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

          

          {/* Salad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
                <Salad className="h-5 w-5 text-accent" />
                Ensalada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={wantsSalad ? "yes" : "no"} onValueChange={(val) => setWantsSalad(val === "yes")}>
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="no" id="salad-no" />
                  <Label htmlFor="salad-no" className="cursor-pointer font-medium text-muted-foreground">Sin ensalada</Label>
                </div>
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value="yes" id="salad-yes" />
                  <Label htmlFor="salad-yes" className="cursor-pointer font-medium">Con ensalada</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-sans font-semibold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Medio de pago *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={(val) => {
            setPaymentMethod(val as "efectivo" | "nequi");
            if (val === "efectivo") setCustomerPhone("");
          }}>
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <RadioGroupItem value="efectivo" id="pay-efectivo" />
              <Label htmlFor="pay-efectivo" className="cursor-pointer font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4 text-accent" /> Efectivo
              </Label>
            </div>
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
              <RadioGroupItem value="nequi" id="pay-nequi" />
              <Label htmlFor="pay-nequi" className="cursor-pointer font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" /> Nequi
              </Label>
            </div>
          </RadioGroup>
          {paymentMethod === "nequi" && (
            <div className="mt-3 pt-3 border-t border-border">
              <Label htmlFor="phone">Número Nequi / cuenta para transferencia</Label>
              <Input id="phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="300 123 4567" className="mt-1" />
            </div>
          )}
        </CardContent>
      </Card>

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
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar pedido?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Revisa tu pedido antes de enviarlo:</p>
                <div className="bg-secondary/30 rounded-lg p-4 text-sm space-y-1 text-foreground">
                  <p><span className="font-medium">Nombre:</span> {customerName}</p>
                  {customerPhone && <p><span className="font-medium">Teléfono:</span> {customerPhone}</p>}
                  {isSpecialOrder ? (
                    <p><span className="font-medium">Especial:</span> ⭐ {specials.find(s => s.id === selectedSpecial)?.name}</p>
                  ) : (
                    <>
                      <p><span className="font-medium">Proteína:</span> {proteins.find(p => p.id === selectedProtein)?.name || '-'}</p>
                      <p><span className="font-medium">Principio:</span> {selectedSide !== "none" ? sides.find(s => s.id === selectedSide)?.name : 'Sin principio'}</p>
                      <p><span className="font-medium">Ensalada:</span> {wantsSalad ? 'Sí' : 'No'}</p>
                    </>
                  )}
                  <p><span className="font-medium">Sopa:</span> {selectedSoup !== "none" ? soups.find(s => s.id === selectedSoup)?.name : 'Sin sopa'}</p>
                  {notes && <p><span className="font-medium">Notas:</span> {notes}</p>}
                  <p><span className="font-medium">Pago:</span> {paymentMethod === 'nequi' ? 'Nequi' : 'Efectivo'}</p>
                  <p className="font-bold text-primary pt-1">Total: {formatPrice(totalPrice)}</p>
                </div>
                <p className="text-muted-foreground text-xs">Una vez enviado no podrás modificarlo.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOrder}>Sí, hacer pedido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
