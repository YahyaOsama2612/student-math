import React from "react";
import { Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import TruncatedText from "./TruncatedText";

const ReusableTableSearch = ({ 
  title, 
  columns, 
  data = [], 
  onAddClick, 
  titleAdd, 
  onEdit,     
  onDelete,   
  extraActions, 
  showStatusInActions = false,
  onToggleStatus,
  statusKey = "status",
  loading = false,

  // Pagination Props
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
children,
  // Search & Filter Props
  searchTerm = "",
  onSearchChange = () => {},
  filters = [],          // مصفوفة إعدادات الفلاتر
  filterValues = {},     // القيم الحالية للفلاتر
  onFilterChange = () => {} // دالة تتنفذ عند تغيير أي فلتر
}) => {

  return (
    <div className={`w-full space-y-4 p-4 bg-background text-left ${loading ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className=' flex gap-2'>
          {title && <h2 className="text-xl text-one md:text-2xl font-semibold">{title}</h2>}
          {children && (
    <div className="w-full md:w-auto">
      {children}
    </div>
  )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-2 pl-10 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-one outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Add Button */}
          {titleAdd && (
            <button
              onClick={onAddClick}
              className="w-full md:w-auto bg-one hover:bg-one/90 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Add {titleAdd}
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      {filters && filters.length > 0 && (
        <div className="p-4 bg-muted/10 border border-border rounded-xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filters.map((filter, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {filter.label}
                </label>
                <select
                  value={filterValues[filter.key] || ""}
                  onChange={(e) => onFilterChange(filter.key, e.target.value)}
                  className="w-full p-2 border border-border rounded-lg bg-card text-foreground text-sm outline-none focus:border-one focus:ring-1 focus:ring-one transition-colors cursor-pointer"
                >
                  <option value="">All</option>
                  {filter.options.map((opt, i) => (
                    <option key={i} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground border-b border-border"> 
                <th className="p-3 font-bold text-one uppercase text-[11px] tracking-widest text-center w-12">#</th>
                {columns.map((col, index) => (
                  <th key={index} className="p-4 font-bold text-one uppercase text-[11px] tracking-widest">
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete || extraActions || showStatusInActions) && (
                  <th className="p-4 font-bold text-one uppercase text-[11px] tracking-widest text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr
                    key={row.id || rowIndex}
                    className="hover:bg-one/5 transition-colors border-b border-border last:border-0"
                  >
                    <td className="p-3 text-foreground text-sm text-center font-medium">
                      {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                    </td>

                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="p-4 text-foreground text-sm">
                        {col.render ? col.render(row[col.key], row) : (
                          <TruncatedText text={String(row[col.key] || "")} />
                        )}
                      </td>
                    ))}

                    {(onEdit || onDelete || extraActions || showStatusInActions) && (
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-2 flex-wrap">
                          {showStatusInActions && (
                            <button
                              onClick={() => onToggleStatus?.(row)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${
                                row[statusKey] === "active" ? "bg-green-500" : "bg-gray-300"
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                row[statusKey] === "active" ? "translate-x-4" : "translate-x-1"
                              }`} />
                            </button>
                          )}

                          {extraActions && extraActions(row)}

                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="group p-2 rounded-lg hover:bg-blue-600 transition-all border border-transparent hover:border-blue-700"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-blue-600 group-hover:text-white" />
                            </button>
                          )}

                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="group p-2 rounded-lg hover:bg-red-600 transition-all border border-transparent hover:border-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="p-20 text-center text-muted-foreground italic bg-muted/5">
                    {loading ? "Loading results..." : "No results found matching your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Section */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-muted/10 rounded-lg border border-border gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Total <span className="text-foreground font-bold">{totalResults}</span> items
          </div>

          <select 
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="bg-card border border-border rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-one cursor-pointer"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) onPageChange(val);
              }}
              className="w-12 text-center border border-border rounded bg-card py-1 font-bold outline-none focus:ring-1 focus:ring-one"
            />
            <span>of {totalPages || 1}</span>
          </div>

          <div className="flex gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-2 border border-border rounded bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-2 border border-border rounded bg-card hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReusableTableSearch;