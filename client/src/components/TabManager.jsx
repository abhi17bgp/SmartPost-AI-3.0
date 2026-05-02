import React from 'react';
import { Plus, X, Menu } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

const TabManager = ({ onToggleSidebar }) => {
  const { tabs, setTabs, activeTabId, setActiveTabId } = useWorkspace();

  const handleAddTab = () => {
    const newId = `tab_${Date.now()}`;
    setTabs([...tabs, { id: newId, title: 'Untitled Request', isNew: true }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // Create a fresh tab if closing the last one
      const newId = `tab_${Date.now()}`;
      setTabs([{ id: newId, title: 'Untitled Request', isNew: true }]);
      setActiveTabId(newId);
      return;
    }

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="flex bg-card border-b border-border overflow-x-auto h-10 w-full shrink-0 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style dangerouslySetInnerHTML={{ __html: `::-webkit-scrollbar { display: none; }` }} />
      <button 
        onClick={onToggleSidebar}
        className="md:hidden h-10 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center shrink-0 border-r border-border"
      >
        <Menu size={18} />
      </button>
      <div className="flex items-center h-full">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`
              h-full flex items-center px-4 min-w-[150px] max-w-[200px] border-r border-border cursor-pointer group select-none transition-colors
              ${activeTabId === tab.id
                ? 'bg-muted/50 text-primary border-t-2 border-t-primary'
                : 'bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground border-t-2 border-t-transparent'}
            `}
          >
            <div className="flex items-center gap-2 overflow-hidden w-full h-10">
              <span className={`text-[10px] font-mono font-bold shrink-0 ${tab.method === 'GET' ? 'text-primary' : tab.method === 'POST' ? 'text-secondary' : 'text-muted-foreground'}`}>
                {tab.method || 'GET'}
              </span>
              <span className="text-xs truncate flex-1 font-medium">{tab.title}</span>
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className={`shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ${activeTabId === tab.id ? 'opacity-100' : ''}`}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleAddTab}
          className="h-10 px-3 text-muted-foreground hover:text-primary hover:bg-muted/30 transition-colors flex items-center justify-center shrink-0 border-r border-border"
          title="New Tab"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default TabManager;
