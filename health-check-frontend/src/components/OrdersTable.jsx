import { parseServerDate } from "../utils/date";

export default function OrdersTable({ orders }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-shopify-border bg-shopify-card px-4 py-10 text-center text-sm text-shopify-sub">
        No orders match this filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-shopify-border bg-shopify-card shadow-sm">
      <table className="min-w-full divide-y divide-shopify-border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Order</Th>
            <Th>Date</Th>
            <Th>Age</Th>
            <Th>Items</Th>
            <Th align="right">Total</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50">
              <Td className="font-semibold text-shopify-blue">{order.order_number}</Td>
              <Td>
                {parseServerDate(order.placed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </Td>
              <Td>
                {order.age_days} day{order.age_days === 1 ? "" : "s"}
              </Td>
              <Td>
                {order.item_count} item{order.item_count === 1 ? "" : "s"}
              </Td>
              <Td align="right">${order.total_amount.toFixed(2)}</Td>
              <Td>
                <span className="inline-flex items-center rounded-md bg-shopify-amber-bg px-2.5 py-1 text-xs font-bold text-shopify-amber">
                  Unfulfilled
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-shopify-sub ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left", className = "" }) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-shopify-ink-2 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
