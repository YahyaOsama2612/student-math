import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import TruncatedText from "./TruncatedText";

// --- Custom Searchable Select Component ---
const SearchableSelect = ({ value, onChange, options, placeholder = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // إغلاق القائمة المنسدلة عند الضغط في أي مكان خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // فلترة الخيارات
  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    // التعديل هنا: خلينا الـ z-index يتغير بناءً على حالة الـ isOpen عشان يظهر فوق الكل
    <div className={`relative w-full ${isOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-2 border border-border rounded-lg bg-card text-foreground text-sm outline-none focus:ring-1 focus:ring-one cursor-pointer transition-colors"
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* مربع البحث */}
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40 w-3 h-3" />
              <input
                type="text"
                placeholder="Search options..."
                className="w-full p-1.5 pl-7 text-xs border border-border rounded bg-background text-foreground outline-none focus:border-one focus:ring-1 focus:ring-one"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </div>

          {/* الخيارات */}
          <ul className="py-1 overflow-y-auto max-h-48 custom-scrollbar bg-card">
            <li
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-one/10 transition-colors ${!value ? "bg-one/5 text-one font-bold" : ""}`}
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchQuery("");
              }}
            >
              All (الكل)
            </li>
            
            {filteredOptions.length > 0 ? (
              filteredOptions.map((val, idx) => (
                <li
                  key={idx}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-one/10 transition-colors ${value === val ? "bg-one/5 text-one font-bold" : ""}`}
                  onClick={() => {
                    onChange(val);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                >
                  {val}
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-xs text-center text-muted-foreground italic">
                No results found.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- Main Table Component ---
const ReusableTable = ({ 
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
  children

}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const getUniqueValues = (key) => {
    const values = data.map((item) => String(item[key] || "").trim()).filter(Boolean);
    return [...new Set(values)];
  };

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesGlobalSearch = columns.some((col) =>
        String(row[col.key] || "").toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesColumnFilters = columns.every((col) => {
        if (!col.filterable || !columnFilters[col.key]) return true;
        
        const cellValue = String(row[col.key] || "").toLowerCase();
        const filterValue = columnFilters[col.key].toLowerCase();
        
        if (col.filterType === 'select') {
          return cellValue === filterValue;
        }
        
        return cellValue.includes(filterValue);
      });

      return matchesGlobalSearch && matchesColumnFilters;
    });
  }, [data, columns, searchTerm, columnFilters]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const hasFilters = columns.some((col) => col.filterable);

  return (
    <div className="w-full space-y-4 p-4 bg-background text-left">
      
      {/* Header */}
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
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search all..."
              className="w-full p-2 pl-10 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-one outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

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

      {/* قسم الفلاتر أعلى الجدول */}
      {hasFilters && (
        <div className="p-4 bg-muted/10 border border-border rounded-xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {columns
              .filter((col) => col.filterable)
              .map((col, index) => (
                // التعديل هنا: شيلنا الـ z-10 الثابتة عشان متعملش حظر للـ Select اللي هيفتح
                <div key={index} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {col.header}
                  </label>
                  
                  {col.filterType === 'select' ? (
                    <SearchableSelect
                      value={columnFilters[col.key] || ''}
                      onChange={(val) => handleColumnFilterChange(col.key, val)}
                      options={getUniqueValues(col.key)}
                      placeholder="All"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={`Search ${col.header}...`}
                      className="w-full p-2 border border-border rounded-lg bg-card text-foreground text-sm outline-none focus:border-one focus:ring-1 focus:ring-one transition-colors"
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* الجدول */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                <th className="p-4 font-bold text-one uppercase text-[11px] tracking-widest align-middle">
                  #
                </th>
                {columns.map((col, index) => (
                  <th key={index} className="p-4 font-bold text-one uppercase text-[11px] tracking-widest align-middle">
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete || extraActions || showStatusInActions) && (
                  <th className="p-4 font-bold text-one uppercase text-[11px] tracking-widest text-center align-middle">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {currentRows.length > 0 ? (
                currentRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-one/5 transition-colors border-b border-border last:border-0">
                    <td className="p-4 text-foreground text-sm">{(currentPage - 1) * rowsPerPage + rowIndex + 1}</td>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="p-4 text-foreground text-sm">
                        {col.render ? (
                          col.render(row[col.key], row)
                        ) : (
                          <TruncatedText text={String(row[col.key] || "")} />
                        )}
                      </td>
                    ))}

                    {/* Actions Column */}
                    {(onEdit || onDelete || extraActions || showStatusInActions) && (
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-2 flex-wrap">
                          {showStatusInActions && (
                            onToggleStatus ? (
                              <button
                                onClick={() => onToggleStatus(row)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 ${
                                  row[statusKey] === "active" ? "bg-green-500" : "bg-gray-300"
                                }`}
                                title={row[statusKey] === "active" ? "Deactivate" : "Activate"}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                    row[statusKey] === "active" ? "translate-x-4" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  row[statusKey] === "active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {row[statusKey]}
                              </span>
                            )
                          )}
                          {extraActions && extraActions(row)}
                          {onEdit && (
                            <button onClick={() => onEdit(row)} className="group p-2 rounded-lg transition-all duration-200 hover:bg-blue-600 hover:scale-105" title="Edit">
                              <Pencil className="w-4 h-4 text-blue-600 transition-all duration-200 group-hover:text-white group-hover:-rotate-6" />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(row)} className="group p-2 rounded-lg transition-all duration-200 hover:bg-red-600 hover:scale-105" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-600 transition-colors duration-200 group-hover:text-white group-hover:rotate-6" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="p-10 text-center text-muted-foreground italic">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-muted/10 rounded-lg border border-border gap-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="text-foreground font-bold">{currentRows.length}</span> of <span className="text-foreground font-bold">{filteredData.length}</span> results
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={currentPage}
              onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
              className="w-12 text-center border border-border rounded bg-card py-1 font-bold outline-none focus:ring-1 focus:ring-one"
            />
            <span>of {totalPages || 1}</span>
          </div>
          <div className="flex gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="p-2 border border-border rounded bg-card hover:bg-muted disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((p) => p + 1)} className="p-2 border border-border rounded bg-card hover:bg-muted disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReusableTable;