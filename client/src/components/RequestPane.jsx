import React, { useState } from 'react';
import { Send, Save, ChevronDown, X, Settings } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import toast from 'react-hot-toast';
import api from '../utils/axiosInstance';

// Utility function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Utility function to ensure all items have IDs
const ensureItemsHaveIds = (items) => {
  return items.map((item) => ({
    ...item,
    id: item.id || generateId()
  }));
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// Memoized KeyValueEditor component to prevent unnecessary re-renders
const KeyValueEditor = React.memo(({ name, state, onChange, onAddRow, onDeleteRow }) => (
  <div className="flex flex-col gap-2 w-full overflow-x-auto custom-scrollbar pb-2">
    <div className="min-w-[400px]">
      <div className="grid grid-cols-[30px_1fr_1fr_30px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">
        <div></div>
        <div>Key</div>
        <div>Value</div>
        <div></div>
      </div>
      {state.map((item, index) => (
        <div key={item.id} className="grid grid-cols-[30px_1fr_1fr_30px] gap-2 items-center group mb-2">
          <div className="flex items-center justify-center">
            {/* Custom Glassmorphic Checkbox */}
            <label className="relative flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={(e) => onChange(item.id, 'isActive', e.target.checked)}
                className="hidden"
                name={`${name.toLowerCase()}-active-${item.id}`}
                id={`${name.toLowerCase()}-active-${item.id}`}
                aria-label={`Toggle ${name} Active`}
              />
              <div className={`w-4 h-4 rounded transition-all duration-200 border flex items-center justify-center shadow-sm ${item.isActive ? 'bg-primary border-primary shadow-primary/30' : 'bg-background border-border group-hover:border-primary/50'}`}>
                 {item.isActive && (
                    <svg className="w-3 h-3 text-primary-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                 )}
              </div>
            </label>
          </div>
          <input
            type="text"
            value={item.key}
            onChange={(e) => onChange(item.id, 'key', e.target.value)}
            placeholder={name + " Key"}
            className="bg-transparent border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-primary/50 focus:outline-none transition-colors w-full placeholder:text-muted-foreground/50"
            name={`${name.toLowerCase().replace(/\s+/g, '-')}-key-${item.id}`}
            id={`${name.toLowerCase().replace(/\s+/g, '-')}-key-${item.id}`}
            aria-label={`${name} Key`}
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => onChange(item.id, 'value', e.target.value)}
            placeholder="Value"
            className="bg-transparent border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-primary/50 focus:outline-none transition-colors w-full placeholder:text-muted-foreground/50"
            name={`${name.toLowerCase().replace(/\s+/g, '-')}-value-${item.id}`}
            id={`${name.toLowerCase().replace(/\s+/g, '-')}-value-${item.id}`}
            aria-label={`${name} Value`}
          />
          <div className="flex items-center justify-center">
            {index !== state.length - 1 && (
              <button
                onClick={() => onDeleteRow(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all font-bold"
              >×</button>
            )}
          </div>
        </div>
      ))}
      <div className="mt-3 flex justify-center">
        <button
          onClick={onAddRow}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-lg transition-all duration-200"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add {name} Row
        </button>
      </div>
    </div>
  </div>
));

const FormDataEditor = React.memo(({ name, state, onChange, onAddRow, onDeleteRow }) => (
  <div className="flex flex-col gap-2 w-full overflow-x-auto custom-scrollbar pb-2">
    <div className="min-w-[500px]">
      <div className="grid grid-cols-[30px_1fr_100px_1fr_30px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">
        <div></div>
        <div>Key</div>
        <div>Type</div>
        <div>Value</div>
        <div></div>
      </div>
      {state.map((item, index) => (
        <div key={item.id} className="grid grid-cols-[30px_1fr_100px_1fr_30px] gap-2 items-center group mb-2">
          <div className="flex items-center justify-center">
            <label className="relative flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={item.isActive}
                onChange={(e) => onChange(item.id, 'isActive', e.target.checked)}
                className="hidden"
                name={`${name.toLowerCase().replace(/\s+/g, '-')}-active-${item.id}`}
                id={`${name.toLowerCase().replace(/\s+/g, '-')}-active-${item.id}`}
                aria-label={`Toggle ${name} Active`}
              />
              <div className={`w-4 h-4 rounded transition-all duration-200 border flex items-center justify-center shadow-sm ${item.isActive ? 'bg-primary border-primary shadow-primary/30' : 'bg-background border-border group-hover:border-primary/50'}`}>
                 {item.isActive && (
                    <svg className="w-3 h-3 text-primary-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                 )}
              </div>
            </label>
          </div>
          <input
            type="text"
            value={item.key}
            onChange={(e) => onChange(item.id, 'key', e.target.value)}
            placeholder={name + " Key"}
            className="bg-transparent border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-primary/50 focus:outline-none transition-colors w-full placeholder:text-muted-foreground/50"
            name={`${name.toLowerCase().replace(/\s+/g, '-')}-key-${item.id}`}
            id={`${name.toLowerCase().replace(/\s+/g, '-')}-key-${item.id}`}
            aria-label={`${name} Key`}
          />
          <select
            value={item.type || 'text'}
            onChange={(e) => onChange(item.id, 'type', e.target.value)}
            className="bg-transparent border border-border rounded px-2 py-1.5 text-sm focus:border-primary/50 focus:outline-none transition-colors w-full text-foreground"
            name={`${name.toLowerCase().replace(/\s+/g, '-')}-type-${item.id}`}
            id={`${name.toLowerCase().replace(/\s+/g, '-')}-type-${item.id}`}
            aria-label={`${name} Type`}
          >
            <option className="bg-card text-foreground" value="text">Text</option>
            <option className="bg-card text-foreground" value="file">File</option>
          </select>
          {item.type === 'file' ? (
            <div className="relative flex items-center h-full">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    onChange(item.id, 'file', file);
                    onChange(item.id, 'value', file.name);
                  } else {
                    onChange(item.id, 'file', null);
                    onChange(item.id, 'value', '');
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                name={`${name.toLowerCase().replace(/\s+/g, '-')}-file-${item.id}`}
                id={`${name.toLowerCase().replace(/\s+/g, '-')}-file-${item.id}`}
                aria-label={`${name} File`}
              />
              <div className="bg-transparent border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-primary/50 transition-colors w-full truncate text-muted-foreground flex items-center">
                {item.file ? item.file.name : 'Choose File...'}
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={item.value || ''}
              onChange={(e) => onChange(item.id, 'value', e.target.value)}
              placeholder="Value"
              className="bg-transparent border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-primary/50 focus:outline-none transition-colors w-full placeholder:text-muted-foreground/50"
              name={`${name.toLowerCase().replace(/\s+/g, '-')}-value-${item.id}`}
              id={`${name.toLowerCase().replace(/\s+/g, '-')}-value-${item.id}`}
              aria-label={`${name} Value`}
            />
          )}
          <div className="flex items-center justify-center">
            {index !== state.length - 1 && (
              <button
                onClick={() => onDeleteRow(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all font-bold"
              >×</button>
            )}
          </div>
        </div>
      ))}
      <div className="mt-3 flex justify-center">
        <button
          onClick={onAddRow}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-lg transition-all duration-200"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add {name} Row
        </button>
      </div>
    </div>
  </div>
));

const RequestPane = ({ setResponseData, setResponseLoading, tab }) => {
  const { fetchHistory, collections, fetchCollections, currentWorkspace, setTabs, setActiveTabId, responseData, responseAi, setLatestHistoryId, typingUsers, socket } = useWorkspace();
  const { user } = useAuth();
  const { prompt } = useDialog();
  const [method, setMethod] = useState(tab?.method || 'GET');
  const [url, setUrl] = useState(tab?.url || '');
  const [activeTab, setActiveTab] = useState('Params');
  const [showLocalhostHelper, setShowLocalhostHelper] = useState(false);

  // Detect localhost/local IP
  React.useEffect(() => {
    const isLocal = url.toLowerCase().includes('localhost') || url.includes('127.0.0.1');
    setShowLocalhostHelper(isLocal);
  }, [url]);

  // Save Request Modal States
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [requestName, setRequestName] = useState(tab?.title && tab.title !== 'Untitled Request' ? tab.title : '');
  const [selectedCollection, setSelectedCollection] = useState(tab?.collectionId || '');

  const [queryParams, setQueryParams] = useState(() => 
    ensureItemsHaveIds(tab?.queryParams || [{ key: '', value: '', isActive: true }])
  );
  const [headers, setHeaders] = useState(() => 
    ensureItemsHaveIds(tab?.headers || [{ key: '', value: '', isActive: true }])
  );
  const [bodyMode, setBodyMode] = useState(tab?.body?.mode || 'json');
  const [bodyContent, setBodyContent] = useState(tab?.body?.content || '{\n  \n}');
  const [formDataState, setFormDataState] = useState(() => 
    ensureItemsHaveIds(tab?.formData || [{ key: '', value: '', type: 'text', isActive: true }])
  );

  // Ref for debouncing typing indicator
  const typingTimeoutRef = React.useRef(null);

  // Update effect to reset state correctly when switching tabs
  React.useEffect(() => {
    setMethod(tab?.method || 'GET');
    setUrl(tab?.url || '');
    setQueryParams(ensureItemsHaveIds(tab?.queryParams || [{ key: '', value: '', isActive: true }]));
    setHeaders(ensureItemsHaveIds(tab?.headers || [{ key: '', value: '', isActive: true }]));
    setBodyMode(tab?.body?.mode || 'json');
    setBodyContent(tab?.body?.content || '{\n  \n}');
    setFormDataState(ensureItemsHaveIds(tab?.formData || [{ key: '', value: '', type: 'text', isActive: true }]));
    setRequestName(tab?.title && tab.title !== 'Untitled Request' ? tab.title : '');
    setSelectedCollection(tab?.collectionId || '');

    // Clear any pending typing timeout when switching tabs
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [tab?.id]); // Only run when tab ID changes, not when tab content changes

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = React.useCallback(() => {
    if (!socket || !currentWorkspace || !tab?.id) return;
    socket.emit('typing_request', {
      workspaceId: currentWorkspace._id,
      userName: user?.name,
      requestId: tab.id
    });
  }, [socket, currentWorkspace?._id, user?.name, tab?.id]);

  const handleSend = async () => {
    if (!url) return;
    setResponseLoading(true);
    setResponseData(null);

    try {
      // Process headers & params into objects
      const activeHeaders = headers.reduce((acc, curr) => {
        if (curr.isActive && curr.key) acc[curr.key] = curr.value;
        return acc;
      }, {});

      const activeParams = queryParams.reduce((acc, curr) => {
        if (curr.isActive && curr.key) acc[curr.key] = curr.value;
        return acc;
      }, {});

      // Combine URL with params if valid
      let finalUrl = url;
      if (Object.keys(activeParams).length > 0) {
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
          Object.entries(activeParams).forEach(([k, v]) => urlObj.searchParams.append(k, v));
          finalUrl = urlObj.toString();
        } catch (e) {
          // Ignore invalid URL parse issues for now
          finalUrl = url;
        }
      }

      let parsedBody = null;
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && bodyMode === 'json') {
        try {
          parsedBody = JSON.parse(bodyContent);
        } catch (e) {
          parsedBody = bodyContent; // fallback to string
        }
      }

      let proxyPayload;
      if (bodyMode === 'form-data' && ['POST', 'PUT', 'PATCH'].includes(method)) {
        proxyPayload = new FormData();
        proxyPayload.append('url', finalUrl);
        proxyPayload.append('method', method);
        proxyPayload.append('headers', JSON.stringify(activeHeaders));
        proxyPayload.append('isMultipart', 'true');
        
        formDataState.forEach(item => {
          if (item.isActive && item.key) {
            if (item.type === 'file' && item.file) {
              proxyPayload.append(`data_file_${item.key}`, item.file);
            } else {
              proxyPayload.append(`data_text_${item.key}`, item.value);
            }
          }
        });
      } else {
        proxyPayload = {
          url: finalUrl,
          method,
          headers: activeHeaders,
          data: parsedBody
        };
      }

      // We proxy everything through our backend to bypass CORS
      const res = await api.post('/proxy', proxyPayload);

      setResponseData(res.data.data);

      // Auto-save the response permanently if this is a saved request from a collection
      if (tab?.id?.startsWith('req_')) {
        const reqId = tab.id.replace('req_', '');
        api.patch(`/requests/${reqId}`, {
          lastResponse: {
            status: res.data.data.status,
            timeTaken: res.data.data.timeTaken,
            data: res.data.data.data,
            headers: res.data.data.headers
          }
        }).catch(err => console.error("Auto-save response failed:", err));
      }

      // Save history
      api.post('/history', {
        workspaceId: currentWorkspace?._id,
        method,
        url: finalUrl,
        status: res.data.data.status,
        timeTaken: res.data.data.timeTaken,
        headers,
        queryParams,
        bodyMode,
        bodyContent,
        formData: formDataState.map(fd => ({ ...fd, file: undefined })), // don't save file object
        responseData: res.data.data
      }).then((historyRes) => {
        if (historyRes.data?.data?.history?._id) {
          setLatestHistoryId(prev => ({ ...prev, [tab.id]: historyRes.data.data.history._id }));
        }
        fetchHistory();
      }).catch(() => { });

      // Sync active tab state to global context so PerformanceAnalyzer can access the fresh unsaved URL
      setTabs(prev => prev.map(t => t.id === tab.id ? {
        ...t,
        method,
        url: finalUrl,
        headers,
        queryParams,
        body: { mode: bodyMode, content: bodyContent },
        formData: formDataState
      } : t));

    } catch (err) {
      setResponseData(err.response?.data?.data || {
        status: 0,
        statusText: 'Error',
        data: err.message,
        timeTaken: 0,
        headers: {}
      });
    } finally {
      setResponseLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    const name = await prompt("New Collection", "Enter a name for your new collection:", { placeholder: "e.g. Auth API" });
    if (!name) return;
    try {
      const res = await toast.promise(
        api.post('/collections', { name, workspaceId: currentWorkspace._id }).then(async (res) => {
          await fetchCollections();
          return res;
        }),
        {
          loading: 'Creating collection...',
          success: 'Collection created!',
          error: 'Failed to create collection'
        }
      );
      if (res.data?.data?.collection?._id) {
        setSelectedCollection(res.data.data.collection._id);
      } else if (res.data?.data?._id) {
        setSelectedCollection(res.data.data._id);
      }
    } catch (err) {
      // Handled by toast.promise
    }
  };

  const handleSaveRequest = async () => {
    if (!requestName || !selectedCollection) {
      toast.error('Please provide a name and select a collection');
      return;
    }

    try {
      const currentResponse = responseData[tab.id];
      const currentAi = responseAi[tab.id];

      const payload = {
        name: requestName,
        method,
        url,
        headers,
        queryParams,
        body: { type: bodyMode === 'json' ? 'json' : 'none', content: bodyContent },
        formData: formDataState.map(fd => ({ ...fd, file: undefined })),
        collectionId: selectedCollection,
        workspaceId: currentWorkspace?._id
      };

      if (currentResponse) {
        payload.lastResponse = {
          status: currentResponse.status,
          timeTaken: currentResponse.timeTaken,
          data: currentResponse.data,
          headers: currentResponse.headers
        };
      }

      if (currentAi) {
        payload.aiAnalysis = currentAi;
      }

      await toast.promise(
        (async () => {
          if (tab?.id?.startsWith('req_')) {
            const reqId = tab.id.replace('req_', '');
            const res = await api.patch(`/requests/${reqId}`, payload);

            // Sync tab state so name and configurations stick visually
            setTabs(prev => prev.map(t => t.id === tab.id ? {
              ...t,
              title: payload.name,
              method: payload.method,
              url: payload.url,
              collectionId: selectedCollection,
              headers: payload.headers,
              queryParams: payload.queryParams,
              body: { mode: bodyMode, content: bodyContent },
              formData: formDataState,
              updatedBy: res.data.data.request.updatedBy
            } : t));

          } else {
            const res = await api.post('/requests', payload);
            const newReqId = res.data.data.request._id;

            // Upgrade temporary tab to a persistent saved request tab
            setTabs(prev => prev.map(t => t.id === tab.id ? {
              ...t,
              id: `req_${newReqId}`,
              title: payload.name,
              method: payload.method,
              url: payload.url,
              collectionId: selectedCollection,
              headers: payload.headers,
              queryParams: payload.queryParams,
              body: { mode: bodyMode, content: bodyContent },
              formData: formDataState,
              updatedBy: res.data.data.request.updatedBy
            } : t));
            setActiveTabId(`req_${newReqId}`);
          }
          await fetchCollections(); // Refresh the sidebar
        })(),
        {
          loading: 'Saving request...',
          success: tab?.id?.startsWith('req_') ? 'Request updated successfully!' : 'Request saved successfully!',
          error: tab?.id?.startsWith('req_') ? 'Failed to update request' : 'Failed to save request'
        }
      );

      setShowSaveModal(false);
    } catch (err) {
      // Handled by toast.promise
    }
  };

  const handleKeyValueChange = React.useCallback((itemId, field, value) => {
    setHeaders(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, [field]: value }
        : item
    ));

    // Debounce typing indicator to avoid excessive socket calls
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping();
    }, 300);
  }, [handleTyping]);

  const handleFormDataChange = React.useCallback((itemId, field, value) => {
    setFormDataState(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, [field]: value }
        : item
    ));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping();
    }, 300);
  }, [handleTyping]);

  const handleQueryParamChange = React.useCallback((itemId, field, value) => {
    setQueryParams(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, [field]: value }
        : item
    ));

    // Debounce typing indicator to avoid excessive socket calls
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping();
    }, 300);
  }, [handleTyping]);

  const addHeaderRow = React.useCallback(() => {
    setHeaders(prev => [
      ...prev,
      {
        id: generateId(),
        key: '',
        value: '',
        isActive: true
      }
    ]);
  }, []);

  const addFormDataRow = React.useCallback(() => {
    setFormDataState(prev => [
      ...prev,
      {
        id: generateId(),
        key: '',
        value: '',
        type: 'text',
        isActive: true
      }
    ]);
  }, []);

  const addQueryParamRow = React.useCallback(() => {
    setQueryParams(prev => [
      ...prev,
      {
        id: generateId(),
        key: '',
        value: '',
        isActive: true
      }
    ]);
  }, []);

  const deleteHeaderRow = React.useCallback((itemId) => {
    setHeaders(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const deleteFormDataRow = React.useCallback((itemId) => {
    setFormDataState(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const deleteQueryParamRow = React.useCallback((itemId) => {
    setQueryParams(prev => prev.filter(item => item.id !== itemId));
  }, []);

  return (
    <div className="flex flex-col h-full bg-card relative">
      <div className="p-4 border-b border-border shrink-0 bg-card/80 backdrop-blur z-10 sticky top-0">

        {/* Typing Overlay & Updated By text */}
        <div className="flex justify-between items-end mb-2 h-4">
          <div className="text-[10px] text-muted-foreground font-medium">
            {tab?.updatedBy && `Last updated by ${tab.updatedBy.name}`}
          </div>
          {typingUsers[tab?.id] && typingUsers[tab?.id].userName !== user?.name && (
            <div className="text-xs font-medium text-primary animate-pulse flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              {typingUsers[tab.id].userName} is editing...
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 bg-background p-1.5 rounded-lg border border-border ring-1 ring-inset ring-black/5">
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <div className="relative group shrink-0 min-w-[110px]">
              <CustomSelect
                value={method}
                onChange={(val) => setMethod(val)}
                className={`bg-transparent font-bold px-4 py-2 rounded transition-colors uppercase text-sm w-full
                  ${method === 'GET' ? 'text-primary hover:bg-primary/10' :
                    method === 'POST' ? 'text-blue-500 hover:bg-blue-500/10' :
                      method === 'DELETE' ? 'text-destructive hover:bg-destructive/10' :
                        'text-primary/70 hover:bg-primary/5'}`}
                listClassName="w-[150px] left-0 mt-2"
                options={METHODS.map(m => ({
                  value: m,
                  label: m,
                  className: m === 'GET' ? 'text-primary' : m === 'POST' ? 'text-blue-500' : m === 'DELETE' ? 'text-destructive' : 'text-primary/70'
                }))}
              />
            </div>

            <div className="hidden sm:block w-[1px] bg-border my-1 shrink-0" />

            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); handleTyping(); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter request URL"
              className="flex-1 bg-transparent px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground font-mono text-sm w-full min-w-0"
              name="requestUrl"
              id="requestUrl"
              aria-label="Request URL"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleSend}
              className="flex-1 sm:flex-none justify-center bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 border-0! m-0! rounded-md font-medium text-sm flex items-center gap-2 transition-all shrink-0 ring-1 ring-inset ring-white/10 shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Send size={14} className="" /> <span>Send</span>
            </button>
            <button onClick={() => setShowSaveModal(true)} className="flex-1 sm:flex-none flex items-center justify-center bg-secondary hover:bg-secondary/80 border-0! m-0! text-secondary-foreground px-4 py-2 rounded-md transition-colors shrink-0 border border-border">
              <Save size={14} /> <span className="sm:hidden ml-2 font-medium text-sm">Save</span>
            </button>
          </div>
        </div>

        {/* Localhost Helper Guide */}
        {showLocalhostHelper && (
          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300 shadow-md max-h-[220px] overflow-y-auto custom-scrollbar">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-500 shadow-sm shrink-0">
                <Settings size={18} className="animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">Localhost Detected</h4>
                <p className="text-xs text-foreground/80 dark:text-muted-foreground leading-relaxed mt-1">
                  Since SmartPost AI is a <span className="text-foreground font-bold underline decoration-amber-500/50">Cloud Website</span>, our servers cannot directly reach <span className="font-mono text-amber-900 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-transparent">localhost</span> on your laptop.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method 1: Ngrok */}
              <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-foreground text-background flex items-center justify-center text-[11px] font-black">1</div>
                  <span className="text-xs font-bold text-foreground">Tunneling (Recommended)</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">Make your local API public in seconds using VS Code terminal:</p>
                <div className="bg-muted p-2.5 rounded-md font-mono text-[11px] text-foreground mb-3 select-all border border-border font-bold">
                  npx ngrok http 3000
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-tight">
                  * Replace 3000 with your port. Copy the <span className="text-primary font-bold underline">https://...</span> URL and paste it above.
                </p>
              </div>

              {/* Method 2: Extension */}
              <div className="bg-background p-3 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-foreground text-background flex items-center justify-center text-[11px] font-black">2</div>
                  <span className="text-xs font-bold text-foreground">CORS Bypass Extension</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">Use a browser extension to ignore security rules:</p>
                <ul className="text-[11px] text-muted-foreground space-y-1.5 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>Install <span className="text-foreground font-black underline decoration-primary">"Allow CORS"</span> from Chrome Store.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>Toggle the extension to <span className="text-primary font-black">"ON"</span>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>Refresh this page and try again!</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-border shrink-0 px-2 mt-1 overflow-x-auto custom-scrollbar">
        {['Params', 'Headers', 'Auth', 'Body'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 lg:py-2 text-xs lg:text-sm font-medium transition-all relative ${activeTab === t ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            {t}
            {activeTab === t && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-t-full shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'Params' && <KeyValueEditor name="Query" state={queryParams} onChange={handleQueryParamChange} onAddRow={addQueryParamRow} onDeleteRow={deleteQueryParamRow} />}
        {activeTab === 'Headers' && <KeyValueEditor name="Header" state={headers} onChange={handleKeyValueChange} onAddRow={addHeaderRow} onDeleteRow={deleteHeaderRow} />}
        {activeTab === 'Auth' && <div className="text-sm text-muted-foreground italic p-2 border border-dashed border-border rounded-lg max-w-lg">Auth tab coming soon...</div>}
        {activeTab === 'Body' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex flex-wrap gap-4 mb-2">
              {['none', 'json', 'form-data', 'x-www-form-urlencoded'].map(m => (
                <label key={m} className="flex items-center gap-2 text-sm text-foreground cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 shadow-sm ${bodyMode === m ? 'border-primary bg-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.3)]' : 'border-border bg-background group-hover:border-primary/50 group-hover:bg-accent'}`}>
                    {bodyMode === m && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary)/0.8)]" />}
                  </div>
                  <input
                    type="radio"
                    name="bodyMode"
                    id={`bodyMode-${m}`}
                    value={m}
                    checked={bodyMode === m}
                    onChange={() => setBodyMode(m)}
                    className="hidden"
                    aria-label={`Body mode ${m}`}
                  />
                  <span className={`transition-colors ${bodyMode === m ? 'text-primary font-medium' : 'text-muted-foreground group-hover:text-foreground'}`}>{m}</span>
                </label>
              ))}
            </div>

            {bodyMode === 'json' ? (
              <textarea
                value={bodyContent}
                onChange={(e) => { setBodyContent(e.target.value); handleTyping(); }}
                className="flex-1 w-full bg-background border border-border rounded-lg p-4 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50 custom-scrollbar shadow-inner resize-none min-h-[300px]"
                spellCheck="false"
                name="bodyContent"
                id="bodyContent"
                aria-label="Request Body Content"
              />
            ) : bodyMode === 'form-data' ? (
              <FormDataEditor name="Form Data" state={formDataState} onChange={handleFormDataChange} onAddRow={addFormDataRow} onDeleteRow={deleteFormDataRow} />
            ) : (
              <div className="p-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                Only JSON and form-data are fully supported in this demo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Request Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Save Request</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 font-medium">Request Name</label>
                <input
                  type="text"
                  value={requestName}
                  onChange={e => setRequestName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary transition-colors"
                  placeholder="e.g. Get User Profile"
                  name="requestName"
                  id="requestName"
                  aria-label="Request Name"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm text-muted-foreground font-medium">Save to Collection</label>
                  <button onClick={handleCreateCollection} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    + New Collection
                  </button>
                </div>
                {collections.length === 0 ? (
                  <div className="p-3 text-sm text-amber-500 bg-amber-500/10 rounded-lg border border-amber-500/20 flex flex-col items-center gap-2 text-center">
                    <span>No collections found. Click the button to create one!</span>
                    <button onClick={handleCreateCollection} className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-xs font-medium transition-colors w-full">
                      Create Collection
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedCollection}
                    onChange={e => setSelectedCollection(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                    name="selectedCollection"
                    id="selectedCollection"
                    aria-label="Select Collection"
                  >
                    <option value="" disabled className="text-muted-foreground">Select a collection...</option>
                    {collections.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              <button
                onClick={handleSaveRequest}
                disabled={collections.length === 0}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-medium py-2 rounded-lg mt-4 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestPane;
