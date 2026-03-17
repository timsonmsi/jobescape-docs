"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  FileSignature,
  Scale,
  Menu,
  X,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/invoices", label: "Invoices", icon: FileText, adminOnly: true },
  { href: "/nda", label: "NDA", icon: FileSignature, adminOnly: false },
  { href: "/legal", label: "Legal Review", icon: Scale, adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  // Don't render the sidebar on the login page
  if (pathname === "/login") return null;

  const isAdmin = session?.user?.role === "admin";
  const isLoggedIn = status === "authenticated";
  const close = () => setOpen(false);
  const navItems = baseNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-500 hover:text-gray-800 p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/je_logo.png"
            alt="DocEscape"
            width={28}
            height={28}
            className="rounded-lg shrink-0"
          />
          <span className="text-sm font-bold text-gray-900">DocEscape</span>
        </div>
      </div>

      {/* ── Backdrop (mobile only) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={close}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200",
          "flex flex-col py-6 transition-transform duration-200 ease-in-out",
          "md:relative md:translate-x-0 md:z-auto md:transition-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo row */}
        <div className="px-5 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/je_logo.png"
                alt="DocEscape"
                width={36}
                height={36}
                className="rounded-xl shrink-0"
              />
              <div>
                <span className="text-base font-bold text-gray-900 leading-tight block">
                  DocEscape
                </span>
                <span className="text-xs text-gray-400 leading-tight block">
                  Ops Suite
                </span>
              </div>
            </div>
            {/* Close button – mobile only */}
            <button
              onClick={close}
              className="md:hidden text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-[#ECEFFE] text-[#2B45F5]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon
                  size={16}
                  className={active ? "text-[#2B45F5]" : "text-gray-400"}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — login / logout */}
        <div className="px-5 mt-auto pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-3">DocEscape Ops v0.1</p>
          {isLoggedIn ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#2B45F5] font-medium transition-colors"
            >
              <LogIn size={13} />
              Login
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
