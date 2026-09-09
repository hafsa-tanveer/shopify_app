import { Link, Outlet } from "react-router-dom";
import { ScanProvider, useScan } from "../context/ScanContext";
import { parseServerDate } from "../utils/date";
import Toast from "./Toast";

function AppBar() {
  const { status } = useScan();
  const lastScannedLabel = !status
    ? ""
    : status.last_scanned_at
      ? `Last scanned: Today, ${parseServerDate(status.last_scanned_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Not scanned yet";

  return (
    <div className="flex h-[52px] items-center gap-3 bg-shopify-appbar px-[22px] text-[#e3e3e3]">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 flex-none text-[#95bf47]" aria-hidden="true">
        <path d="M15.3 3.6c-.1 0-1 .3-1 .3s-.7-.7-.8-.8c-.1-.1-.3 0-.4 0 0 0-.2.1-.5.2-.3-.9-.9-1.4-1.7-1.4-.6 0-1.1.4-1.5 1-.6.2-1 .3-1 .3-.4.1-.4.1-.5.5C7.5 4.4 5.5 12 5.5 12l6.8 1.3 3.7-.9S15.4 3.6 15.3 3.6zM12 4.4c-.4.1-.8.2-1.3.4 0-.5-.1-1.1-.3-1.5.6.1.9.8 1.6 1.1zm-1.9-.9c.2.4.3 1 .3 1.5l-1.4.4c.3-1 .8-1.6 1.1-1.9z" />
      </svg>
      <Link to="/" className="text-[15px] font-bold text-white">
        Store Health Check
      </Link>
      <span className="rounded-md bg-[#2b2b2b] px-2.5 py-1 text-xs text-[#c9c9c9]">
        {status?.store_domain ?? "…"}
      </span>
      <div className="ml-auto flex items-center gap-3.5 text-[12.5px] text-[#b5b5b5]">
        <span>{lastScannedLabel}</span>
        <span aria-hidden="true">&middot;</span>
        <span>Settings</span>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <ScanProvider>
      <div className="min-h-screen bg-shopify-bg">
        <AppBar />
        <main className="mx-auto max-w-5xl px-[22px] py-[26px]">
          <Outlet />
        </main>
      </div>
      <Toast />
    </ScanProvider>
  );
}
