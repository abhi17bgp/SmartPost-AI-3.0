import React, { useState } from 'react';
import { Activity, Play, Settings, Server, Clock, ServerCog, Lightbulb, Info, Maximize2, Minimize2, Square, X, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/axiosInstance';
import toast from 'react-hot-toast';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import CustomSelect from './CustomSelect';

const PerformanceAnalyzer = ({ activeReqTab, onClose }) => {
  const { currentWorkspace, latestHistoryId, performanceViewState, setPerformanceViewState } = useWorkspace();
  const { handleUpgrade, user, setUser } = useAuth();
  const { confirm } = useDialog();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [runs, setRuns] = useState(5);
  const [testType, setTestType] = useState('sequential');
  const [progress, setProgress] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [rps, setRps] = useState(0);
  const [payloadSize, setPayloadSize] = useState(0);
  const [requestPayloadSize, setRequestPayloadSize] = useState(0);

  const startTest = async () => {
    if (!activeReqTab || !activeReqTab.url) {
      toast.error('No valid request to test.');
      return;
    }

    try {
      const checkRes = await api.post('/auth/performance-check');
      if (!checkRes.data.data.allowed) {
        toast.error('Free trial limit exceeded.');
        const wantUpgrade = await confirm(
          "Pro Feature", 
          "You've used all your free API Performance Tests. Upgrade to Pro for unlimited tests and team collaboration.", 
          { confirmText: "Upgrade to Pro — ₹100/yr", confirmColor: "bg-primary" }
        );
        if (wantUpgrade) handleUpgrade();
        return;
      }
      
      // Update local storage/context with new count if it's a free user
      if (!checkRes.data.data.isPro) {
        toast.success(`Test started! (${checkRes.data.data.remaining} free tests remaining)`, { icon: 'ℹ️' });
        if (user) {
          const updatedUser = { ...user, performanceTestCount: checkRes.data.data.count };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response.data.message || 'Free trial limit exceeded.');
        const wantUpgrade = await confirm(
          "Pro Feature", 
          "You've used all your free API Performance Tests. Upgrade to Pro for unlimited tests and team collaboration.", 
          { confirmText: "Upgrade to Pro — ₹100/yr", confirmColor: "bg-primary" }
        );
        if (wantUpgrade) handleUpgrade();
        return;
      }
      toast.error('Could not verify subscription status.');
      return;
    }

    setIsRunning(true);
    const testStartTime = Date.now();
    setHasRun(false);
    setResults([]);
    setProgress(0);

    let finalResults = [];

    // Exact logic from RequestPane to prepare the request
    const activeHeaders = activeReqTab.headers.reduce((acc, curr) => {
      if (curr.isActive && curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {});

    const activeParams = activeReqTab.queryParams.reduce((acc, curr) => {
      if (curr.isActive && curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {});

    let finalUrl = activeReqTab.url;
    if (Object.keys(activeParams).length > 0) {
      try {
        const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl}`);
        Object.entries(activeParams).forEach(([k, v]) => urlObj.searchParams.append(k, v));
        finalUrl = urlObj.toString();
      } catch (e) {
        finalUrl = activeReqTab.url;
      }
    }

    let parsedBody = null;
    let isMultipart = false;
    let proxyPayload;

    if ((activeReqTab.method === 'POST' || activeReqTab.method === 'PUT' || activeReqTab.method === 'PATCH')) {
      if (activeReqTab.body?.mode === 'form-data' && activeReqTab.formData) {
        isMultipart = true;
        proxyPayload = new FormData();
        proxyPayload.append('url', finalUrl);
        proxyPayload.append('method', activeReqTab.method);
        proxyPayload.append('headers', JSON.stringify(activeHeaders));
        proxyPayload.append('isMultipart', 'true');
        
        activeReqTab.formData.forEach(item => {
          if (item.isActive && item.key) {
            if (item.type === 'file' && item.file) {
              proxyPayload.append(`data_file_${item.key}`, item.file);
            } else {
              proxyPayload.append(`data_text_${item.key}`, item.value);
            }
          }
        });
      } else if (activeReqTab.body?.mode === 'json') {
        try {
          parsedBody = JSON.parse(activeReqTab.body?.content);
        } catch (e) {
          parsedBody = activeReqTab.body?.content;
        }
        proxyPayload = {
          url: finalUrl,
          method: activeReqTab.method,
          headers: activeHeaders,
          data: parsedBody
        };
      } else {
        proxyPayload = {
          url: finalUrl,
          method: activeReqTab.method,
          headers: activeHeaders,
          data: activeReqTab.body?.content
        };
      }
    } else {
      proxyPayload = {
        url: finalUrl,
        method: activeReqTab.method,
        headers: activeHeaders,
        data: null
      };
    }

    try {
      // Run tests
      if (testType === 'sequential') {
        for (let i = 1; i <= runs; i++) {
          try {
            const startTime = Date.now();
            const res = await api.post('/proxy', proxyPayload);
            const timeTaken = res.data.data.timeTaken || (Date.now() - startTime);
            const size = res.data.data.data ? JSON.stringify(res.data.data.data).length : 0;
            finalResults.push({ run: i, time: timeTaken, error: false, size });
          } catch (err) {
            finalResults.push({ run: i, time: null, error: true, size: 0 });
          }

          setResults([...finalResults]);
          setProgress(Math.round((i / runs) * 100));
        }
      } else {
        // Parallel execution
        finalResults = Array.from({ length: runs }).map((_, i) => ({ run: i + 1, pending: true }));
        setResults([...finalResults]);

        const promises = Array.from({ length: runs }).map(async (_, i) => {
          const runIndex = i + 1;
          try {
            const startTime = Date.now();
            const res = await api.post('/proxy', proxyPayload);
            const timeTaken = res.data.data.timeTaken || (Date.now() - startTime);
            const size = res.data.data.data ? JSON.stringify(res.data.data.data).length : 0;
            return { run: runIndex, time: timeTaken, error: false, size };
          } catch (err) {
            return { run: runIndex, time: null, error: true, size: 0 };
          }
        });

        let completed = 0;
        const wrappedPromises = promises.map((p, i) => p.then(res => {
          completed++;
          finalResults[i] = res;
          setResults([...finalResults]);
          setProgress(Math.round((completed / runs) * 100));
          return res;
        }));

        await Promise.all(wrappedPromises);
      }

      const testEndTime = Date.now();
      const testDurationSeconds = (testEndTime - testStartTime) / 1000;

      // Calculate metrics using the percentile-based methodology
      const validResults = finalResults.filter(r => !r.error && !r.pending && r.time !== null);
      const sortedTimes = validResults.map(r => r.time).sort((a, b) => a - b);
      
      let p50 = 0, p90 = 0, p99 = 0, avg = 0, currentMin = 0, currentMax = 0, errCount = finalResults.filter(r => r.error).length;
      let rpsValue = 0, payloadSizeValue = 0;

      if (validResults.length > 0) {
        const total = validResults.reduce((acc, r) => acc + r.time, 0);
        avg = Math.round(total / validResults.length);
        currentMax = Math.max(...validResults.map(r => r.time));
        currentMin = Math.min(...validResults.map(r => r.time));
        
        // Percentile Calculations
        p50 = sortedTimes[Math.floor(sortedTimes.length * 0.50)] || sortedTimes[0];
        p90 = sortedTimes[Math.floor(sortedTimes.length * 0.90)] || sortedTimes[sortedTimes.length - 1];
        p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || sortedTimes[sortedTimes.length - 1];

        // Throughput (Requests Per Second)
        rpsValue = parseFloat((validResults.length / testDurationSeconds).toFixed(2));
        setRps(rpsValue);
        
        // Accurate Payload size calculation from test runs
        const totalSize = validResults.reduce((acc, r) => acc + (r.size || 0), 0);
        payloadSizeValue = Math.round(totalSize / validResults.length);
        setPayloadSize(payloadSizeValue);

        // Calculate Request Payload Size (constant for all runs in the test)
        if (isMultipart && activeReqTab.formData) {
          let size = 0;
          activeReqTab.formData.forEach(item => {
             if (item.isActive && item.key) {
                 size += item.key.length;
                 if (item.type === 'file' && item.file) {
                     size += item.file.size || 0;
                 } else {
                     size += (item.value || '').length;
                 }
             }
          });
          setRequestPayloadSize(size);
        } else if (parsedBody) {
          const reqSize = typeof parsedBody === 'string' ? parsedBody.length : JSON.stringify(parsedBody).length;
          setRequestPayloadSize(reqSize);
        } else {
          setRequestPayloadSize(0);
        }
      }

      // Stability Ratio Methodology: P90 / P50
      const stabilityRatio = p50 > 0 ? parseFloat((p90 / p50).toFixed(2)) : 1;
      const stable = stabilityRatio <= 1.5 && errCount === 0;

      // Save performance history
      if (currentWorkspace) {
        try {
          const histId = latestHistoryId[activeReqTab.id];
          const payload = {
            isPerformanceRun: true,
            performanceMetrics: {
              runs,
              testType,
              average: avg,
              p50,
              p90,
              p99,
              min: currentMin,
              max: currentMax,
              errorCount: errCount,
              isStable: stable,
              stabilityRatio,
              rps: rpsValue,
              payloadSize: payloadSizeValue,
              requestPayloadSize: parsedBody ? (typeof parsedBody === 'string' ? parsedBody.length : JSON.stringify(parsedBody).length) : 0
            }
          };

          if (histId) {
            await api.patch(`/history/${histId}`, payload);
          } else {
            await api.post('/history', {
              workspaceId: currentWorkspace._id,
              method: activeReqTab.method,
              url: finalUrl,
              status: errCount === 0 ? 200 : 500,
              timeTaken: p50,
              ...payload
            });
          }
        } catch (err) {
          console.error('Failed to save performance run history', err);
        }
      }
    } catch (err) {
      console.error('Performance test execution failed', err);
      toast.error('An error occurred during the performance test.');
    } finally {
      setIsRunning(false);
      setHasRun(true);
    }
  };

  const getPercentiles = () => {
    const validResults = results.filter(r => !r.error && !r.pending && r.time !== null);
    if (validResults.length === 0) return { p50: 0, p90: 0, p99: 0 };
    const sorted = validResults.map(r => r.time).sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.50)] || sorted[0],
      p90: sorted[Math.floor(sorted.length * 0.90)] || sorted[sorted.length - 1],
      p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]
    };
  };

  const { p50, p90, p99 } = getPercentiles();

  const getStabilityData = () => {
    const ratio = p50 > 0 ? parseFloat((p90 / p50).toFixed(2)) : 0;
    let label = "Stable";
    let color = "text-primary";
    if (ratio > 3) {
      label = "Unstable";
      color = "text-destructive";
    } else if (ratio > 1.5) {
      label = "Moderate";
      color = "text-amber-500";
    }
    return { ratio, label, color };
  };
  const stability = getStabilityData();
  const errorCount = results.filter(r => r.error).length;

  let statusColor = 'text-primary';
  let badgeClass = 'bg-primary/20 border-primary/50 text-primary';
  let statusText = 'Excellent';
  let Icon = Server;

  if (errorCount > 0) {
    statusColor = 'text-red-400';
    badgeClass = 'bg-red-500/20 border-red-500/50 text-red-400';
    statusText = 'Failing';
  } else if (p50 > 800) {
    statusColor = 'text-destructive';
    badgeClass = 'bg-destructive/20 border-destructive/50 text-destructive';
    statusText = 'Heavy API';
  } else if (p50 >= 300) {
    statusColor = 'text-amber-500';
    badgeClass = 'bg-amber-500/20 border-amber-500/50 text-amber-500';
    statusText = 'Medium API';
  } else {
    statusText = 'Light API';
  }

  // Actionable Suggestions
  const renderSuggestions = () => {
    // Only show suggestions AFTER the run is fully complete
    if (!hasRun || isRunning || results.length !== runs) return null;

    const suggestions = [];
    if (errorCount > 0) {
      suggestions.push({
        title: "Fix API Errors",
        desc: `Test resulted in ${errorCount} error(s). Review backend logs to resolve failing requests before optimizing for speed.`
      });
    }
    
    if (stability.ratio > 1.5 && errorCount === 0) {
      suggestions.push({
        title: "Address API Instability",
        desc: `Stability ratio is ${stability.ratio}. Response times are inconsistent (P90 is significantly higher than P50).`
      });
    }

    if (p50 > 300 && errorCount === 0) {
      suggestions.push({
        title: "Implement Caching Layer",
        desc: "Add a caching mechanism (Redis, Memcached) to return frequent API responses instantly."
      });
      suggestions.push({
        title: "Optimize Database Queries",
        desc: "Ensure your backend uses indexing properly and eliminate unnecessary joins or N+1 queries."
      });
      
      if (['POST', 'PUT', 'PATCH'].includes(activeReqTab.method)) {
        if (requestPayloadSize > 1024 * 50) { // > 50KB request
          suggestions.push({
            title: "Reduce Request Payload",
            desc: "Large request body detected. Consider compressing data or removing unused fields before sending."
          });
        }
      } else if (activeReqTab.method === 'GET' && requestPayloadSize > 0) {
        suggestions.push({
          title: "GET Request Body",
          desc: "GET requests usually shouldn't have a body. Consider moving parameters to the URL query string."
        });
      }
      
      if (payloadSize > 1024 * 50) { // > 50KB response
        suggestions.push({
          title: "Reduce Response Payload",
          desc: "Large response detected. Consider using pagination, field selection (GraphQL/Sparse fields), or compression."
        });
      } else if (p50 > 300 && requestPayloadSize <= 1024 * 50) {
        suggestions.push({
          title: "Check Network/Processing",
          desc: "Payload size is small but latency is high. Investigate server-side processing time or network hops."
        });
      }
    } else if (stability.ratio <= 1.5 && errorCount === 0 && p50 > 0) {
      suggestions.push({
        title: "Looking Good!",
        desc: "Your API is stable and responds well. Keep up the good work and monitor closely as traffic scales."
      });
    }

    return (
      <div className="mt-6 border border-border rounded-xl bg-muted/30 p-4 animate-fade-in">
        <h4 className="flex items-center gap-2 font-bold text-foreground mb-4">
          <Lightbulb size={16} className="text-amber-500" /> Actionable Insights
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.map((s, idx) => (
            <div key={idx} className="bg-card/50 border border-border p-3 rounded-lg flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground/90">{s.title}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (performanceViewState === 'minimized') {
    return (
      <div 
        className="flex items-center gap-3 bg-card/90 backdrop-blur-xl border border-primary/30 p-2.5 rounded-xl shadow-2xl cursor-pointer hover:bg-accent/50 transition-all border-l-4 border-l-primary"
        onClick={() => setPerformanceViewState('normal')}
      >
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRunning ? 'bg-primary/20' : 'bg-muted'}`}>
            <Activity className={isRunning ? "text-primary animate-pulse" : "text-primary/60"} size={20} />
          </div>
          {isRunning && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0 mr-2">
          <div className="text-[11px] font-bold text-foreground truncate leading-tight">
            {activeReqTab?.title || 'Performance Test'}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isRunning ? (
              <div className="flex items-center gap-1.5 w-full">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[9px] font-mono font-bold text-primary">{progress}%</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground font-medium">
                {p50 > 0 ? (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {p50}ms | {requestPayloadSize > 0 ? `Req: ${requestPayloadSize > 1024 ? (requestPayloadSize/1024).toFixed(1) + 'KB' : requestPayloadSize + 'B'}` : ''} {payloadSize > 0 ? `Res: ${payloadSize > 1024 ? (payloadSize/1024).toFixed(1) + 'KB' : payloadSize + 'B'}` : ''}
                  </span>
                ) : 'Ready to test'}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background overflow-hidden border border-border ${performanceViewState === 'maximized' ? 'rounded-none' : 'rounded-xl shadow-2xl'}`}>
      {/* Header controls */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Activity className="text-primary" size={20} /> API Performance Analyzer
            {performanceViewState === 'maximized' && (
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded uppercase tracking-tighter border border-primary/20">Maximized Mode</span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Stress test your endpoints to ensure stable response times.</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setPerformanceViewState('minimized')} 
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md" 
            title="Minimize to Corner"
          >
            <Minus size={18} />
          </button>
          
          {performanceViewState === 'maximized' ? (
            <button 
              onClick={() => setPerformanceViewState('normal')} 
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md" 
              title="Restore to Window"
            >
              <Square size={14} className="opacity-70" />
            </button>
          ) : (
            <button 
              onClick={() => setPerformanceViewState('maximized')} 
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md" 
              title="Maximize"
            >
              <Maximize2 size={16} />
            </button>
          )}

          <div className="w-[1px] h-4 bg-border mx-1" />
          
          <button onClick={onClose} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-destructive/10 rounded-md" title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 w-full pb-2 md:pb-0">
          <div className="flex flex-wrap items-center gap-3 bg-muted/50 p-1.5 rounded-lg border border-border w-full md:w-auto">
            <div className="flex items-center pl-2 gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
              <Settings size={14} /> Type:
            </div>
            <CustomSelect
              value={testType}
              onChange={(val) => setTestType(val)}
              disabled={isRunning}
              className="bg-background border border-border text-foreground text-sm rounded px-3 py-1 outline-none focus:border-primary shrink-0 min-w-[120px]"
              options={[
                { value: 'sequential', label: 'Sequential' },
                { value: 'parallel', label: 'Parallel' }
              ]}
            />

            <div className="hidden md:block w-px h-5 bg-border shrink-0"></div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground shrink-0">
              Runs:
            </div>
            <CustomSelect
              value={runs}
              onChange={(val) => setRuns(val)}
              disabled={isRunning}
              className="bg-background border border-border text-foreground text-sm rounded px-3 py-1 outline-none focus:border-primary shrink-0 min-w-[120px]"
              listClassName="w-[200px] right-0"
              options={[
                { value: 5, label: '5 Runs' },
                { value: 10, label: '10 Runs' },
                { value: 20, label: '20 Runs (Recommended)' },
                { value: 50, label: '50 Runs' },
                { value: 100, label: '100 Runs (Stress Test)' }
              ]}
            />
            <button
              onClick={startTest}
              disabled={isRunning}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 py-1.5 rounded flex-shrink-0 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isRunning ? (
                <span className="animate-pulse flex items-center gap-1.5"><Activity size={14} /> Running...</span>
              ) : (
                <span className="flex items-center gap-1.5"><Play size={14} fill="currentColor" /> Start Test</span>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="w-full bg-muted h-1.5 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Results Region */}
        {results.length > 0 && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-stretch gap-4 flex-col lg:flex-row">

              {/* Stats Card */}
              <div className="bg-card/80 border border-border rounded-xl p-5 shrink-0 w-full lg:w-72 flex flex-col justify-center relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">P50 Latency (Typical)</span>
                    <Clock size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex items-baseline gap-1 relative z-10">
                    <span className={`text-3xl font-black ${statusColor} font-mono tracking-tighter`}>{p50}</span>
                    <span className="text-muted-foreground font-bold ml-1 text-sm">ms</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold">P90 (Stable threshold)</span>
                    <div className="text-amber-500 font-mono text-sm font-bold">{p90 > 0 ? `${p90}ms` : '--'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold">P99 (Worst-case)</span>
                    <div className="text-destructive font-mono text-sm font-bold">{p99 > 0 ? `${p99}ms` : '--'}</div>
                  </div>
                </div>

                <div className={`grid ${requestPayloadSize > 0 ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-4'} relative z-10 border-t border-border pt-3`}>
                   {requestPayloadSize > 0 ? (
                     <>
                       <div className="flex justify-between items-baseline">
                         <span className="text-muted-foreground text-[10px] uppercase font-bold">Request Payload</span>
                         <div className="text-foreground font-mono text-sm font-bold">{requestPayloadSize > 1024 ? `${(requestPayloadSize/1024).toFixed(1)} KB` : `${requestPayloadSize} B`}</div>
                       </div>
                       <div className="flex justify-between items-baseline border-t border-border/30 pt-1">
                         <span className="text-muted-foreground text-[10px] uppercase font-bold">Response Payload</span>
                         <div className="text-foreground font-mono text-sm font-bold">{payloadSize > 0 ? (payloadSize > 1024 ? `${(payloadSize/1024).toFixed(1)} KB` : `${payloadSize} B`) : '--'}</div>
                       </div>
                     </>
                   ) : (
                     <>
                       <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Throughput</span>
                        <div className="text-foreground font-mono text-sm font-bold">{rps > 0 ? `${rps} RPS` : '--'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Payload Size</span>
                        <div className="text-foreground font-mono text-sm font-bold">{payloadSize > 0 ? (payloadSize > 1024 ? `${(payloadSize/1024).toFixed(1)} KB` : `${payloadSize} B`) : '--'}</div>
                      </div>
                     </>
                   )}
                </div>

                <div className="flex items-center justify-between relative z-10 border-t border-border pt-3">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1" title="Stability Ratio = P90 / P50. A higher ratio indicates inconsistent response times.">
                    Stability ({stability.ratio}) <Info size={10} className="opacity-70" />:
                  </span>
                  <span className={`text-xs font-bold ${stability.color}`}>
                    {stability.label} {stability.ratio <= 1.5 ? '✅' : '⚠️'}
                  </span>
                </div>

                <div className={`mt-2 w-full justify-center px-3 py-1.5 rounded border text-xs font-bold flex items-center gap-1.5 ${badgeClass} relative z-10 shadow-sm`}>
                  <Activity size={12} /> {statusText}
                </div>
              </div>

              {/* Chart Area */}
              <div className={`flex-1 bg-card/80 border border-border rounded-xl p-5 ${performanceViewState === 'maximized' ? 'min-h-[400px]' : 'min-h-[250px]'}`}>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Response Time Trend</h4>
                <div className={`${performanceViewState === 'maximized' ? 'h-80' : 'h-48'} w-full`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="run"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `Req ${val}`}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}ms`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                        formatter={(value) => [`${value}ms`, 'Time']}
                        labelFormatter={(label) => `Request #${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="time"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {renderSuggestions()}
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-48 opacity-60">
            <ServerCog size={40} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">No Test Data</h3>
            <p className="text-muted-foreground text-sm">Select your run count and click "Start Test" to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAnalyzer;
