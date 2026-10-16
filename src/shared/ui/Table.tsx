import { type HTMLAttributes, type ReactNode } from 'react';
import { classNames } from '../utils/helpers';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No hay datos para mostrar',
  loading = false,
  striped = true,
  hoverable = true,
  bordered = true,
  onRowClick,
  className,
  ...props
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto dark:bg-black rounded-2xl">
      <table className={classNames('w-full text-sm dark:bg-black', className)} {...props}>
        <thead>
          <tr className="bg-navy-900 dark:bg-[#071626] text-white text-xs uppercase tracking-wider font-semibold">
            {columns.map((column, idx) => (
              <th
                key={column.key}
                scope="col"
                className={classNames(
                  'px-4 py-3 text-left',
                  idx === 0 && 'rounded-l-2xl',
                  idx === columns.length - 1 && 'rounded-r-2xl',
                  column.headerClassName
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/10 dark:bg-black">
          {loading ? (
            <tr className="dark:bg-black">
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cargando...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr className="dark:bg-black">
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                className={classNames(
                  'dark:bg-black',
                  striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-white/[0.02]',
                  hoverable && 'hover:bg-gray-50 dark:hover:bg-white/[0.05]',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={classNames('px-4 py-3 text-gray-900 dark:text-slate-100', bordered && 'border-b border-gray-100 dark:border-white/10', column.className)}
                  >
                    {column.render ? column.render(row, rowIndex) : (row as Record<string, unknown>)[column.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function TablePagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  showPageSize = false,
  pageSize,
  onPageSizeChange 
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(page => 
    page === 1 || 
    page === totalPages || 
    (page >= currentPage - 1 && page <= currentPage + 1)
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/10">
      <div className="text-sm text-gray-700 dark:text-slate-300">
        Página {currentPage} de {totalPages}
      </div>
      <div className="flex items-center gap-2">
        {showPageSize && pageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-4 py-1 text-sm border border-slate-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-navy-900 bg-white dark:bg-slate-950 dark:border-white/15 dark:text-slate-100"
            aria-label="Tamaño de página"
          >
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        )}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Primera página"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={classNames(
                'px-3.5 py-1 text-sm rounded-full font-medium transition-all',
                page === currentPage
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
              )}
              aria-current={page === currentPage ? 'page' : undefined}
              aria-label={`Página ${page}`}
            >
              {index > 0 && visiblePages[index - 1] !== page - 1 && (
                <span className="px-2 text-gray-400">...</span>
              )}
              {page}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Página siguiente"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Última página"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7m-8-14l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}