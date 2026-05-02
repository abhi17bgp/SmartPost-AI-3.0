import React, { createContext, useContext, useState, useEffect } from 'react';

const DialogContext = createContext({
  confirm: () => Promise.resolve(false),
  prompt: () => Promise.resolve(null),
  alert: () => Promise.resolve()
});

export const useDialog = () => useContext(DialogContext);

const GlassDialog = ({ dialog, onClose }) => {
  const [inputValue, setInputValue] = useState(dialog.defaultValue || '');

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose(dialog.id, dialog.type === 'prompt' ? null : false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dialog.type === 'prompt') {
      onClose(dialog.id, inputValue.trim() || null);
    } else {
      onClose(dialog.id, true);
    }
  };

  return (
    <div className="pointer-events-auto relative w-full max-w-sm sm:max-w-md bg-card/40 backdrop-blur-2xl border border-border rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in origin-center transform ring-1 ring-border z-50">
      {/* Decorative Top Gradient Edge */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${dialog.isDanger ? 'bg-destructive' : 'bg-primary'}`} />
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
          {dialog.title}
        </h3>
        
        {dialog.message && (
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            {dialog.message}
          </p>
        )}
        
        <form onSubmit={handleSubmit}>
          {dialog.type === 'prompt' && (
            <input 
              autoFocus
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={dialog.placeholder}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all mb-6 shadow-inner"
            />
          )}
 
          <div className="flex justify-end gap-3 font-medium">
            {dialog.type !== 'alert' && (
              <button 
                type="button" 
                onClick={() => onClose(dialog.id, dialog.type === 'prompt' ? null : false)}
                className="px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
            )}
            <button 
              type="submit"
              className={`px-6 py-2.5 rounded-xl transition-all transform active:scale-95 border border-transparent font-bold ${
                dialog.isDanger 
                  ? 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-lg shadow-destructive/20 border-destructive/50' 
                  : 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 border-primary/50'
              }`}
            >
              {dialog.confirmText || 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
 
export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);
 
  const confirm = (title, message, options = {}) => {
    return new Promise((resolve) => {
      setDialogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'confirm',
        title,
        message,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        isDanger: options.isDanger || false,
        resolve
      }]);
    });
  };
 
  const prompt = (title, message, options = {}) => {
    return new Promise((resolve) => {
      setDialogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'prompt',
        title,
        message,
        placeholder: options.placeholder || "",
        defaultValue: options.defaultValue || "",
        confirmText: options.confirmText || "Submit",
        cancelText: options.cancelText || "Cancel",
        resolve
      }]);
    });
  };
 
  const notifyAlert = (title, message, options = {}) => {
    return new Promise((resolve) => {
      setDialogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'alert',
        title,
        message,
        confirmText: options.confirmText || "OK",
        isDanger: options.isDanger || false,
        resolve
      }]);
    });
  };
 
  const closeDialog = (id, result) => {
    const dialog = dialogs.find(d => d.id === id);
    if (dialog) dialog.resolve(result);
    setDialogs(prev => prev.filter(d => d.id !== id));
  };
 
  return (
    <DialogContext.Provider value={{ confirm, prompt, alert: notifyAlert }}>
      {children}
      
      {dialogs.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none font-sans">
          {/* Blur Backdrop */}
          <div 
            className="absolute inset-0 bg-background/40 backdrop-blur-[4px] pointer-events-auto"
            onClick={() => closeDialog(dialogs[dialogs.length - 1].id, dialogs[dialogs.length - 1].type === 'prompt' ? null : false)}
          />
          {dialogs.map(dialog => (
            <GlassDialog key={dialog.id} dialog={dialog} onClose={closeDialog} />
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
};
