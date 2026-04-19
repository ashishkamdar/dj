interface OrderWithItems {
  items: {
    name: string;
    quantity: number;
    unit: string | null;
  }[];
}

export function formatOrderSummary(
  date: string,
  orders: OrderWithItems[]
): string {
  // Aggregate all order items by product across all orders
  const productMap = new Map<string, { qty: number; unit: string }>();

  for (const order of orders) {
    for (const item of order.items) {
      const unit = item.unit ?? "kg";
      const key = `${item.name}-${unit}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.qty += item.quantity;
      } else {
        productMap.set(key, { qty: item.quantity, unit });
      }
    }
  }

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date + "T00:00:00"));

  let text = `📋 Orders for ${formattedDate}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  for (const [key, { qty, unit }] of productMap) {
    const productName = key.split("-")[0];
    text += `${productName} — ${qty} ${unit}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Total items: ${productMap.size}`;

  return text;
}
