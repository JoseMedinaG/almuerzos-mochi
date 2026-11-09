import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface RecentOrdersViewProps {
  menuId: string;
}

export default function RecentOrdersView({ menuId }: RecentOrdersViewProps) {
  const [maxItems, setMaxItems] = useState(4);

  const { data: nequiWinner } = useQuery({
    queryKey: ["raffleWinner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "nequi_raffle_winner")
        .maybeSingle();
      const val = data?.value as { name: string; phone?: string; date?: string } | null;
      const today = new Date().toISOString().split("T")[0];
      if (val && val.date && val.date !== today) return null;
      return val;
    },
    refetchInterval: 15000,
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["nequiRaffleHistory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "nequi_raffle_history")
        .maybeSingle();
      const val = data?.value as { wins?: { name: string; phone?: string; date: string }[] } | null;
      const wins = (val?.wins ?? []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      return wins;
    },
    refetchInterval: 15000,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(price);

  const wins = history ?? [];
  const visible = wins.slice(0, maxItems);

  return (
    <div className="space-y-4">
      {nequiWinner?.name && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm border bg-primary/10 border-primary/30">
          <Trophy className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-primary">
            <span className="font-semibold">Responsable Nequi hoy:</span>{" "}
            <span className="font-bold text-foreground">{nequiWinner.name}</span>
            {nequiWinner.phone && (
              <span className="block text-xs mt-0.5 opacity-90">📱 {nequiWinner.phone}</span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {visible.length} de {wins.length} responsable(s) Nequi
        </p>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={maxItems === 4 ? "default" : "outline"}
            onClick={() => setMaxItems(4)}
            className="h-7 px-2 text-xs"
          >
            4
          </Button>
          <Button
            size="sm"
            variant={maxItems === 7 ? "default" : "outline"}
            onClick={() => setMaxItems(7)}
            className="h-7 px-2 text-xs"
          >
            7
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-4">Cargando...</p>}
      {!isLoading && !visible.length && (
        <p className="text-center text-muted-foreground py-4">No hay responsables Nequi registrados.</p>
      )}

      <div className="space-y-2">
        {visible.map((w, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{w.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(w.date + "T00:00:00").toLocaleDateString("es-CO", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="text-white border-transparent text-xs" style={{ backgroundColor: "#C8007C" }}>
                Nequi
              </Badge>
              {w.phone && <span className="text-xs text-muted-foreground">📱 {w.phone}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}