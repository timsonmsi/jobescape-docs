import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleTileProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  countLabel?: string;
}

export function ModuleTile({
  title,
  description,
  href,
  icon: Icon,
  count,
  countLabel,
}: ModuleTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block bg-white rounded-xl border border-gray-200 p-6",
        "hover:border-blue-300 hover:shadow-md transition-all duration-200"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          <Icon size={22} className="text-blue-600" />
        </div>
        <ArrowRight
          size={18}
          className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>

      {count !== undefined && (
        <div className="pt-4 border-t border-gray-100">
          <span className="text-2xl font-bold text-blue-600">{count}</span>
          {countLabel && (
            <span className="text-xs text-gray-400 ml-1">{countLabel}</span>
          )}
        </div>
      )}
    </Link>
  );
}
