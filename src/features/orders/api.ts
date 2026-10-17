import { http } from "@/lib/http";
import type { Order } from "@/lib/contracts";

export async function getOrder(orderId: string) {
  return (await http.get<{ order: Order }>(`/orders/${orderId}`)).data.order;
}
