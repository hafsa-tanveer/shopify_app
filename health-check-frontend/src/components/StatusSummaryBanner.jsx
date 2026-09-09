export default function StatusSummaryBanner({ totalConflicts, ordersAffected, ordersAwaitingAction }) {
  return (
    <div className="flex items-start gap-5 rounded-2xl border border-shopify-border bg-shopify-card p-5 shadow-sm sm:items-center">
      <div className="grid h-[52px] w-[52px] flex-none place-items-center rounded-xl bg-shopify-amber-bg text-shopify-amber">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
          <path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
      </div>
      <div>
        <h2 className="font-bold text-shopify-ink">Your store needs attention</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-shopify-sub">
          We found data conflicts and catalog gaps that can cause overselling, failed catalog updates
          and fulfillment delays. Review the breakdown below and drill into any figure to see and fix
          the affected products or orders.
        </p>
        <span className="mt-2 inline-block rounded-full bg-shopify-amber-bg px-3 py-1 text-[11px] font-bold text-shopify-amber">
          {totalConflicts} conflicts &middot; {ordersAffected} orders affected &middot; {ordersAwaitingAction} orders
          awaiting action
        </span>
      </div>
    </div>
  );
}
