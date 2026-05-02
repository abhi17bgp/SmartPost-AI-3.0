import React, { useState } from 'react';
import TabManager from '../components/TabManager';
import Sidebar from '../components/Sidebar';
import RequestPane from '../components/RequestPane';
import ResponsePane from '../components/ResponsePane';
import PerformanceAnalyzer from '../components/PerformanceAnalyzer';
import { useWorkspace } from '../context/WorkspaceContext';

const Dashboard = () => {
  const { 
    tabs, 
    activeTabId, 
    responseData, 
    setResponseData, 
    responseLoading, 
    setResponseLoading, 
    performanceModalOpen, 
    setPerformanceModalOpen,
    performanceViewState,
    setPerformanceViewState
  } = useWorkspace();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleSetResponseData = (data) => {
    setResponseData(prev => ({ ...prev, [activeTabId]: data }));
  };

  const handleSetResponseLoading = (loading) => {
    setResponseLoading(prev => ({ ...prev, [activeTabId]: loading }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background border-t-[3px] border-primary font-sans relative">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Layout */}
      <main className="flex-1 flex flex-col min-w-0 bg-background shadow-xl overflow-hidden shadow-black/10 z-20 ring-1 ring-border relative">
        <TabManager onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        {/* Workspace Panes Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Request Pane */}
          <section className="flex-1 flex flex-col border-r border-border lg:w-1/2 overflow-hidden bg-card shrink-0">
            <RequestPane
              key={`req_${activeTabId}`}
              tab={activeTab}
              setResponseData={handleSetResponseData}
              setResponseLoading={handleSetResponseLoading}
            />
          </section>

          {/* Response Pane */}
          <section className="flex-1 flex flex-col lg:w-1/2 overflow-hidden bg-background shrink-0">
            <ResponsePane
              key={`res_${activeTabId}`}
              data={responseData[activeTabId]}
              loading={responseLoading[activeTabId]}
            />
          </section>
        </div>
      </main>
      
      {/* Global Performance Modal - High Z-index with screen-wide backdrop */}
      {performanceModalOpen && (
        <div className={performanceViewState === 'minimized' 
          ? "fixed bottom-6 right-6 z-[110] w-auto h-auto transition-all duration-500 ease-in-out" 
          : "fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in transition-all duration-500"
        }>
          <div className={`transition-all duration-500 ease-in-out overflow-hidden rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] 
            ${performanceViewState === 'maximized' ? 'w-full h-full max-w-none' : 
              performanceViewState === 'minimized' ? 'w-72 h-auto' : 
              'w-full max-w-4xl h-[85vh]'}`}>
            <PerformanceAnalyzer 
              activeReqTab={activeTab} 
              onClose={() => {
                setPerformanceModalOpen(false);
                setPerformanceViewState('normal');
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
