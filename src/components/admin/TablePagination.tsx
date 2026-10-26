'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  itemLabel?: string;
  className?: string;
}

/**
 * Reusable Show Entries Dropdown
 */
export function ShowEntriesSelect({
  value,
  onChange,
  options = [5, 10, 25, 50, 100],
  className = '',
}: {
  value: number;
  onChange: (val: number) => void;
  options?: number[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs text-slate-700 font-semibold whitespace-nowrap ${className}`}>
      <span className="text-slate-500">Show</span>
      <div className="relative inline-block">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl pl-3 pr-8 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none cursor-pointer transition shadow-2xs"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
          ▼
        </span>
      </div>
      <span className="text-slate-500">entries</span>
    </div>
  );
}

/**
 * Full Table Pagination Bar with "Showing X to Y of Z entries" and page buttons
 */
export default function TablePagination({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  onItemsPerPageChange,
  perPageOptions = [5, 10, 25, 50, 100],
  itemLabel = 'entries',
  className = '',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startEntry = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  // Helper for generating page numbers with ellipses
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      '...',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      '...',
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs ${className}`}
    >
      {/* Left: Entries Info & Optional Dropdown */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 whitespace-nowrap">
        {onItemsPerPageChange && (
          <ShowEntriesSelect
            value={itemsPerPage}
            onChange={(val) => {
              onItemsPerPageChange(val);
              onPageChange(1);
            }}
            options={perPageOptions}
          />
        )}
        <div className="text-slate-500 text-xs font-medium">
          Showing <span className="font-bold text-slate-900">{startEntry}</span> to{' '}
          <span className="font-bold text-slate-900">{endEntry}</span> of{' '}
          <span className="font-bold text-orange-600">{totalItems}</span> {itemLabel}
        </div>
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1.5 whitespace-nowrap overflow-x-auto max-w-full pb-1 sm:pb-0">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Previous Page"
          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            safeCurrentPage <= 1
              ? 'bg-slate-100 text-slate-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-2xs'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-slate-400 text-xs font-bold select-none"
              >
                &hellip;
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === safeCurrentPage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-600/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-2xs'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          aria-label="Next Page"
          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            safeCurrentPage >= totalPages
              ? 'bg-slate-100 text-slate-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-2xs'
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
