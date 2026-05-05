import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, FileJson, Clock, Server, MonitorDown, Bot, Loader2, Activity, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import api from '../utils/axiosInstance';
import { useWorkspace } from '../context/WorkspaceContext';
import PerformanceAnalyzer from './PerformanceAnalyzer';

const ResponsePane = ({ data, loading }) => {
  const { tabs, activeTabId, responseAi, setResponseAi, responseAiLoading, setResponseAiLoading, latestHistoryId, fetchHistory, fetchCollections, setPerformanceModalOpen } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('Body');
  const [isAiMaximized, setIsAiMaximized] = useState(false);

  const activeReqTab = tabs.find(t => t.id === activeTabId);

  const aiAnalysis = responseAi[activeTabId] || null;
  const aiLoading = responseAiLoading[activeTabId] || false;

  // Automatically clear the AI analysis when a new request starts loading
  useEffect(() => {
    if (loading) {
      setResponseAi(prev => ({ ...prev, [activeTabId]: null }));
      setResponseAiLoading(prev => ({ ...prev, [activeTabId]: false }));
      if (activeTab === 'AI Analysis') {
        setActiveTab('Body');
      }
    }
  }, [loading, activeTab, activeTabId, setResponseAi, setResponseAiLoading]);

  const handleAnalyze = async () => {
    if (!data) return;
    setActiveTab('AI Analysis');
    setResponseAiLoading(prev => ({ ...prev, [activeTabId]: true }));
    setResponseAi(prev => ({ ...prev, [activeTabId]: null }));
    try {
      const res = await api.post('/ai/analyze', {
        status: data.status,
        data: data.data,
        headers: data.headers,
        timeTaken: data.timeTaken,
        url: activeReqTab?.url,
        method: activeReqTab?.method
      });
      const analysisText = res.data.data.analysis;
      setResponseAi(prev => ({ ...prev, [activeTabId]: analysisText }));

      // Auto-save the AI Analysis permanently if this is a saved request from a collection
      if (activeTabId.startsWith('req_')) {
        const reqId = activeTabId.replace('req_', '');
        api.patch(`/requests/${reqId}`, { aiAnalysis: analysisText })
          .then(() => fetchCollections?.())
          .catch(err => console.error("Auto-save AI failed:", err));
      }

      // Auto-save the AI Analysis to the global history log
      const histId = latestHistoryId?.[activeTabId];
      if (histId) {
        api.patch(`/history/${histId}`, { aiAnalysis: analysisText })
          .then(() => fetchHistory?.())
          .catch(err => console.error("History auto-save AI failed:", err));
      }

      toast.success("Analysis complete!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error('AI Analysis failed: ' + errorMsg, { duration: 5000 });
      setResponseAi(prev => ({ ...prev, [activeTabId]: 'ERROR' }));
    } finally {
      setResponseAiLoading(prev => ({ ...prev, [activeTabId]: false }));
    }
  };

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-muted-foreground';
    if (status >= 200 && status < 300) return 'text-primary';
    if (status >= 300 && status < 400) return 'text-secondary';
    if (status >= 400 && status < 500) return 'text-amber-500';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background border-l border-border">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-t-2 border-muted animate-spin animation-delay-150"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        </div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm font-bold animate-pulse tracking-widest uppercase">Sending Request</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background border-l border-border">
        <div className="w-20 h-20 mb-6 text-muted-foreground/20">
          <MonitorDown size={80} strokeWidth={1} />
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2 tracking-tight">Ready to Send</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs text-center font-medium">Hit the Send button to execute the request and see the response here.</p>
      </div>
    );
  }

  const prettyJsonSrc = typeof data.data === 'string'
    ? data.data
    : JSON.stringify(data.data, null, 2);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">Status</span>
            <span className={`font-mono text-sm font-bold ${getStatusColor(data.status)} flex items-center gap-1.5`}>
              {data.status} <span className="font-sans text-xs opacity-90">{data.statusText}</span>
            </span>
          </div>
          <div className="w-[1px] h-5 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={12} /> Time</span>
            <span className="font-mono text-sm text-primary font-bold">{data.timeTaken}<span className="text-primary/70 font-bold text-xs ml-0.5">ms</span></span>
          </div>
          <div className="w-[1px] h-5 bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Server size={12} /> Size</span>
            <span className="font-mono text-sm text-foreground font-medium">{prettyJsonSrc?.length > 1024 ? (prettyJsonSrc.length / 1024).toFixed(2) + ' KB' : prettyJsonSrc?.length + ' B'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row border-b border-border shrink-0 px-2 mt-1 justify-between items-end">
        <div className="flex overflow-x-auto custom-scrollbar w-full sm:w-auto">
          {['Body', 'Headers', 'AI Analysis'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-xs font-bold transition-all relative ${activeTab === t ? (t === 'AI Analysis' ? 'text-purple-600 dark:text-purple-400' : 'text-primary') : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-accent'} ${t === 'AI Analysis' && activeTab !== t ? 'hover:text-purple-600' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                {t === 'AI Analysis' && <Bot size={12} className={activeTab === t ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500/60'} />}
                {t}
              </div>
              {activeTab === t && <div className={`absolute bottom-0 left-0 w-full h-[2px] ${t === 'AI Analysis' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]'}`} />}
            </button>
          ))}
        </div>
        <div className="flex items-center w-full sm:w-auto justify-end mt-2 sm:mt-0 pb-1 sm:pb-0">
          <button
            onClick={() => setPerformanceModalOpen(true)}
            className="mb-1 mr-2 text-xs font-bold px-3 py-1.5 rounded-md text-primary hover:text-primary-foreground hover:bg-primary/90 bg-primary/10 flex items-center gap-1.5 transition-all border border-primary/20"
            title="Run Performance Tests"
          >
            <Activity size={12} /> Test API
          </button>
          <button
            onClick={handleAnalyze}
            disabled={aiLoading}
            className="mb-1 mr-2 text-xs font-bold px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transform transition-all active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed border border-purple-400/30"
            title="Analyze response using SmartPost AI"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />} Analyze
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background relative group">
        {activeTab === 'Body' && (
          <>
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 bg-card/80 hover:bg-accent text-muted-foreground rounded-md opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm border border-border shadow-lg z-10"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
            </button>
            <pre className="p-4 m-0 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-all custom-scrollbar h-full bg-muted/30">
              {typeof data.data === 'string'
                ? (data.data.startsWith('<') ? <span className="text-destructive opacity-80">{data.data} // HTML returned</span> : <span className="text-foreground">{data.data}</span>)
                : prettyJsonSrc}
            </pre>
          </>
        )}

        {activeTab === 'Headers' && (
          <div className="p-4 grid grid-cols-[1fr_2fr] gap-x-4 gap-y-2 font-mono text-xs max-w-3xl">
            {Object.entries(data.headers || {}).map(([key, value]) => (
              <React.Fragment key={key}>
                <div className="text-slate-700 dark:text-slate-300 font-bold border-b border-border/50 py-1.5 break-all">{key}</div>
                <div className="text-primary border-b border-border/50 py-1.5 break-all">{value}</div>
              </React.Fragment>
            ))}
          </div>
        )}

        {activeTab === 'AI Analysis' && (
          (() => {
            const aiContent = (
              <div className={isAiMaximized 
                ? "fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm p-4 sm:p-8 flex justify-center overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
                : "p-6 h-full overflow-y-auto custom-scrollbar bg-background relative"
              }>
            <div className={isAiMaximized ? "w-full max-w-5xl bg-card border border-border shadow-2xl rounded-xl p-6 sm:p-10 relative mt-4 sm:mt-8 mb-auto" : "relative h-full"}>
              
              {/* Maximize Toggle Button */}
              {aiAnalysis && aiAnalysis !== 'ERROR' && (
                <button
                  onClick={() => setIsAiMaximized(!isAiMaximized)}
                  className="absolute top-2 right-2 p-2 bg-muted/50 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border shadow-sm z-10"
                  title={isAiMaximized ? "Minimize" : "Maximize"}
                >
                  {isAiMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              )}

              {/* Maximized View Header */}
              {isAiMaximized && aiAnalysis && aiAnalysis !== 'ERROR' && !aiLoading && (
                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner">
                    <Bot className="text-purple-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight">SmartPost AI Analysis</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Deep architectural and security insights into your API response</p>
                  </div>
                </div>
              )}

              {aiLoading ? (
                <div className="flex flex-col items-center justify-center h-full opacity-80 animate-fade-in min-h-[300px]">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Bot size={48} className="text-purple-500 animate-pulse relative z-10" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-2 tracking-tight">SmartPost AI is analyzing...</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">Scanning payload, headers, and status code</p>
                </div>
              ) : aiAnalysis === 'ERROR' ? (
                <div className="flex flex-col items-center justify-center h-full opacity-80 animate-in fade-in zoom-in-95 duration-300 min-h-[300px]">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
                    <Bot size={32} className="text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold text-destructive mb-2">Analysis Failed</h3>
                  <p className="text-foreground font-medium text-sm text-center max-w-sm mb-4">
                    SmartPost AI encountered an error while processing this request.
                  </p>
                  <p className="text-muted-foreground text-xs text-center max-w-sm bg-muted/50 p-3 rounded-lg border border-border">
                    Please verify your <span className="font-mono text-primary">GEMINI_API_KEY</span> is correctly configured in your server environment variables and the AI service is reachable.
                  </p>
                </div>
              ) : aiAnalysis ? (
                <div 
                  className={`prose dark:prose-invert max-w-none text-[15px] leading-relaxed font-medium animate-fade-in break-words ${isAiMaximized ? 'mt-4' : ''}`}
                  style={{
                    '--tw-prose-body': 'hsl(var(--foreground))',
                    '--tw-prose-headings': 'hsl(var(--foreground))',
                    '--tw-prose-lead': 'hsl(var(--foreground))',
                    '--tw-prose-links': 'hsl(var(--primary))',
                    '--tw-prose-bold': 'hsl(var(--primary))',
                    '--tw-prose-counters': 'hsl(var(--foreground))',
                    '--tw-prose-bullets': 'hsl(var(--primary))',
                    '--tw-prose-hr': 'hsl(var(--border))',
                    '--tw-prose-quotes': 'hsl(var(--foreground))',
                    '--tw-prose-quote-borders': 'hsl(var(--primary))',
                    '--tw-prose-captions': 'hsl(var(--muted-foreground))',
                    '--tw-prose-code': 'hsl(var(--primary))',
                    '--tw-prose-pre-code': 'hsl(var(--foreground))',
                    '--tw-prose-pre-bg': 'hsl(var(--muted))',
                    '--tw-prose-th-borders': 'hsl(var(--border))',
                    '--tw-prose-td-borders': 'hsl(var(--border))',
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAnalysis}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-60 min-h-[300px]">
                  <Bot size={40} className="text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No Analysis Yet</h3>
                  <p className="text-muted-foreground text-sm">Click the <strong className="text-purple-500">Analyze</strong> button above to uncover insights.</p>
                </div>
              )}
            </div>
          </div>
            );
            return isAiMaximized ? createPortal(aiContent, document.body) : aiContent;
          })()
        )}

      </div>
    </div>
  );
};

export default ResponsePane;
