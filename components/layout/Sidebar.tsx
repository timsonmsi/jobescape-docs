"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, FileSignature, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/nda", label: "NDA", icon: FileSignature },
  { href: "/legal", label: "Legal Review", icon: Scale },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 shrink-0">
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/je_logo.png"
            alt="JobEscape"
            width={36}
            height={36}
            className="rounded-xl shrink-0"
          />
          <div>
            <span className="text-base font-bold text-gray-900 leading-tight block">
              JobEscape
            </span>
            <span className="text-xs text-gray-400 leading-tight block">
              Ops Suite
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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

      <div className="px-5 mt-auto pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">JobEscape Ops v0.1</p>
        {/* TODO(auth): Add user profile / logout here */}
      </div>
    </aside>
  );
}
