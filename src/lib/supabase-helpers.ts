import { supabase } from "@/integrations/supabase/client";

export async function getTodayMenu() {
  const today = new Date().toISOString().split('T')[0];
  const { data: menu, error } = await supabase
    .from('daily_menus')
    .select('*')
    .eq('date', today)
    .maybeSingle();
  
  if (error) throw error;
  return menu;
}

export async function getMenuItems(menuId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_id', menuId)
    .order('type')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function createOrder(order: {
  menu_id: string;
  customer_name: string;
  customer_phone?: string;
  protein_id?: string;
  side_id?: string;
  wants_soup: boolean;
  soup_id?: string;
  wants_salad: boolean;
  special_id?: string;
  notes?: string;
  total_price: number;
  payment_method: "efectivo" | "nequi";
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTodayOrders(menuId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      protein:menu_items!orders_protein_id_fkey(name, price),
      side:menu_items!orders_side_id_fkey(name),
      soup:menu_items!orders_soup_id_fkey(name),
      special:menu_items!orders_special_id_fkey(name, price)
    `)
    .eq('menu_id', menuId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createDailyMenu(date: string, greeting: string) {
  const { data, error } = await supabase
    .from('daily_menus')
    .insert({ date, greeting })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function addMenuItem(item: {
  menu_id: string;
  type: 'sopa' | 'principio' | 'proteina' | 'especial';
  name: string;
  price?: number;
}) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(item)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function checkIsAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}
