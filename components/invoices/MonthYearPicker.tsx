"use client";

import { useRouter } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthYearPickerProps {
  month: string;
  year: number;
}

export function MonthYearPicker({ month, year }: MonthYearPickerProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const navigate = (m: string, y: number) => {
    router.push(`/invoices?month=${encodeURIComponent(m)}&year=${y}`);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => navigate(e.target.value, year)}
        className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2B45F5] cursor-pointer"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => navigate(month, Number(e.target.value))}
        className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2B45F5] cursor-pointer"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
