import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  disabled, 
  className = "", 
  listClassName = "",
  renderValue 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer select-none ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {renderValue ? renderValue(value) : (options.find(o => o.value === value)?.label || value)}
        <ChevronDown size={14} className={`ml-2 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className={`absolute z-[100] mt-1 bg-card border border-border/50 rounded-lg shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${listClassName || 'w-full min-w-[120px] left-0'}`}>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-sm text-foreground hover:bg-accent cursor-pointer transition-colors flex items-center justify-between group"
            >
              <span className={`font-medium ${opt.className || ''}`}>{opt.label}</span>
              {value === opt.value && <Check size={14} className="text-primary" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
