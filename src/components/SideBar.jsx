import React, { useState } from "react";
import { LogOut, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FaBusAlt } from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { TbMathSymbols } from "react-icons/tb";

const SideBar = ({ menuItems, isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };
const [openIndex, setOpenIndex] = useState(null);

  return (
    <aside
      className={`
        bg-white shadow-xl flex flex-col h-screen transition-all duration-300 ease-in-out z-50
        
        /* موبايل: وضع عائم (Fixed) */
        fixed inset-y-0 left-0 w-64 transform 
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        
        /* ديسك توب: وضع ثابت (Static) يدفع المحتوى */
        md:relative md:translate-x-0 
        ${isExpanded ? "md:w-64" : "md:w-20"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-20 border-b border-gray-100 shrink-0 relative">
        <div className="flex items-center gap-x-3 overflow-hidden">
          <TbMathSymbols size={35} className="text-one shrink-0" />
          <h1 className={`font-bold text-xl text-one whitespace-nowrap transition-all duration-300 
            ${!isExpanded ? "md:opacity-0 md:-translate-x-10" : "opacity-100 translate-x-0"}`}>
Math House          </h1>
        </div>

        {/* زر إغلاق الموبايل */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden text-gray-500 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>

        {/* زر التوسيع للديسك توب */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden md:flex absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-100 z-50 items-center justify-center"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Menu Items */}
      <ul className="flex-1 pt-4 px-3 space-y-2 overflow-y-auto custom-scrollbar"  
               style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
>
        
{menuItems.map((item, index) => {
  const hasChildren = item.children?.length > 0;
  const isOpen = openIndex === index;

  return (
    <li key={index}>
      {/* الأب */}
      {hasChildren ? (
        <button
          onClick={() =>
            setOpenIndex(isOpen ? null : index)
          }
          className={`
            w-full flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
            ${isOpen ? "bg-one text-white shadow-lg shadow-one/40" : "text-gray-600 hover:bg-gray-50"}
            ${!isExpanded ? "md:justify-center" : "gap-x-4"}
          `}
        >
          <span className="shrink-0">{item.icon}</span>

          <span className={`${!isExpanded ? "md:hidden" : "block"} font-medium flex-1 text-left`}>
            {item.title}
          </span>

          {/* السهم */}
          {isExpanded && (
            <ChevronRight
              size={16}
              className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          )}
        </button>
      ) : (
        <NavLink
          to={item.path}
          end={item.path === "/admin"}
          onClick={() => setIsMobileOpen(false)}
          className={({ isActive }) => `
            flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
            ${isActive ? "bg-one text-white shadow-lg shadow-one/40" : "text-gray-600 hover:bg-gray-50"}
            ${!isExpanded ? "md:justify-center" : "gap-x-4"}
          `}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className={`${!isExpanded ? "md:hidden" : "block"} font-medium`}>
            {item.title}
          </span>
        </NavLink>
      )}

      {/* الأبناء */}
      {hasChildren && isOpen && isExpanded && (
        <ul className="ml-8 mt-1 space-y-1">
          {item.children.map((child, i) => (
            <li key={i}>
              <NavLink
                to={child.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  block px-3 py-2 rounded-md text-sm transition
                  ${isActive
                    ? "bg-one/10 text-one font-semibold"
                    : "text-gray-600 hover:bg-gray-100"}
                `}
              >
                {child.title}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
})}


      </ul>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full p-3 rounded-lg text-one/80 hover:text-one/50 hover:bg-red-50 transition-all
            ${!isExpanded ? "md:justify-center" : "gap-x-4"}
          `}
        >
          <LogOut size={20} className="shrink-0" />
          <span className={`font-medium whitespace-nowrap transition-all duration-200
            ${!isExpanded ? "md:hidden" : "block"}
          `}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default SideBar;