import { UtensilsCrossed, Soup, Salad, Star } from "lucide-react";

interface MenuItem {
  id: string;
  type: string;
  name: string;
  price: number | null;
}

interface MenuDisplayProps {
  greeting: string;
  items: MenuItem[];
}

export default function MenuDisplay({ greeting, items }: MenuDisplayProps) {
  const proteins = items.filter(i => i.type === "proteina");
  const sides = items.filter(i => i.type === "principio");
  const soups = items.filter(i => i.type === "sopa");
  const specials = items.filter(i => i.type === "especial");

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="space-y-6">
      <p className="text-lg text-muted-foreground italic">{greeting}</p>

      {soups.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Soup className="h-5 w-5 text-warm-gold" /> Sopa
          </h3>
          <ul className="space-y-1 pl-7">
            {soups.map(s => <li key={s.id} className="text-foreground">{s.name}</li>)}
          </ul>
        </div>
      )}

      {sides.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Salad className="h-5 w-5 text-accent" /> Principio
          </h3>
          <ul className="space-y-1 pl-7">
            {sides.map(s => <li key={s.id}>{s.name}</li>)}
          </ul>
        </div>
      )}

      {proteins.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" /> Proteínas
          </h3>
          <ul className="space-y-1 pl-7">
            {proteins.map(p => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-primary font-semibold">{p.price ? formatPrice(p.price) : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {specials.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Star className="h-5 w-5 text-warm-gold" /> Especiales
          </h3>
          <ul className="space-y-1 pl-7">
            {specials.map(s => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-primary font-semibold">{s.price ? formatPrice(s.price) : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
