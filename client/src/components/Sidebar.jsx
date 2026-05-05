import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, Plus, PlaySquare, ChevronRight, ChevronDown, Trash2, X, Folder, History, Users, KeyRound, Check, Bot, Activity, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/axiosInstance';
import { useDialog } from '../context/DialogContext';
import WorkspaceSettingsModal from './WorkspaceSettingsModal';
import ThemeToggle from './ThemeToggle';

const Sidebar = ({ isOpen, onClose }) => {
  const { currentWorkspace, setCurrentWorkspace, workspaces, fetchWorkspaces, collections, savedRequests, fetchCollections, history, fetchHistory, tabs, setTabs, setActiveTabId, setResponseData, setResponseAi, setLatestHistoryId, performanceModalOpen } = useWorkspace();
  const { user, logout, updateProfile, handleUpgrade } = useAuth();
  const { confirm, prompt } = useDialog();
  const [activeTab, setActiveTab] = useState('collections'); // 'collections' or 'history'
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const isDeletingRef = React.useRef(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    company: user?.company || '',
    title: user?.title || ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);

  useEffect(() => {
    if (user && showSettingsModal) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        company: user.company || '',
        title: user.title || ''
      });
      setPhotoFile(null);
      setPhotoPreview(user.photo || null);
    }
  }, [user, showSettingsModal]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      let dataToSubmit = { ...profileForm };

      // Check if user is removing their photo
      if (!photoFile && photoPreview === 'default.jpg' && user?.photo !== 'default.jpg') {
        dataToSubmit.removePhoto = true;
      }

      // If a file is selected, use FormData
      if (photoFile) {
        const formData = new FormData();
        Object.keys(dataToSubmit).forEach(key => {
          formData.append(key, dataToSubmit[key]);
        });
        formData.append('photo', photoFile);
        dataToSubmit = formData;
      }

      await toast.promise(
        updateProfile(dataToSubmit),
        {
          loading: 'Updating profile...',
          success: 'Profile updated successfully!',
          error: (err) => err.response?.data?.message || err.message || 'Failed to update profile'
        }
      );
      setPhotoFile(null);
    } catch (err) { }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      try {
        // Compress image to under 500KB before uploading
        const options = {
          maxSizeMB: 0.5,          // 500KB max
          maxWidthOrHeight: 800,   // Resize to max 800px
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(file, options);
        console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

        setPhotoFile(compressedFile);
        setPhotoPreview(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error('Image compression failed:', err);
        toast.error('Failed to process image. Please try a different one.');
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('default.jpg');
  };

  const handleDeleteAccount = async () => {
    setShowSettingsModal(false);

    const isConfirmed = await confirm("Delete Account", "Are you absolutely sure you want to delete your account? This action cannot be undone.", { isDanger: true, confirmText: 'Delete My Account' });

    if (isConfirmed) {
      try {
        await toast.promise(
          api.delete('/auth/deleteMe'),
          {
            loading: 'Deleting account...',
            success: 'Account deleted successfully!',
            error: 'Failed to delete account'
          }
        );
        logout(workspaces);
      } catch (err) {
        // Handled by toast
      }
    } else {
      // Re-open settings modal if they cancel
      setShowSettingsModal(true);
    }
  };

  // Auto-close menu when performance modal opens
  useEffect(() => {
    if (performanceModalOpen) {
      setShowWorkspaceMenu(false);
    }
  }, [performanceModalOpen]);

  const handleCreateWorkspace = async () => {
    const name = await prompt("New Workspace", "Enter a name for your new workspace:", { placeholder: "e.g. My Team Project" });
    if (!name) return;
    try {
      const res = await toast.promise(
        api.post('/workspaces', { name }),
        {
          loading: 'Creating workspace...',
          success: 'Workspace created!',
          error: 'Failed to create workspace'
        }
      );
      fetchWorkspaces();
      setCurrentWorkspace(res.data.data.workspace);
      setShowWorkspaceMenu(false);
    } catch (err) { }
  };

  const handleJoinWorkspace = async () => {
    if (!user?.isSubscribed) {
      const wantUpgrade = await confirm(
        "Pro Feature",
        "Joining team workspaces is a Pro feature. Upgrade to collaborate with others.",
        { confirmText: "Upgrade to Pro — ₹100/yr", confirmColor: "bg-primary" }
      );
      if (wantUpgrade) handleUpgrade();
      return;
    }
    const joinCode = await prompt("Join Workspace", "Enter the 6-character workspace mix code:", { placeholder: "e.g. A1B2C3" });
    if (!joinCode) return;
    try {
      const res = await toast.promise(
        api.post('/workspaces/join', { joinCode: joinCode.toUpperCase() }),
        {
          loading: 'Joining workspace...',
          success: 'Successfully joined!',
          error: (err) => err.response?.data?.message || 'Failed to join workspace'
        }
      );
      fetchWorkspaces();
      setCurrentWorkspace(res.data.data.workspace);
      setShowWorkspaceMenu(false);
    } catch (err) { }
  };

  const handleCreateCollection = async () => {
    if (!currentWorkspace) {
      toast.error("You must have an active workspace to create a collection.");
      return;
    }
    const name = await prompt("New Collection", "Enter a name for your collection:", { placeholder: "e.g. Users API" });
    if (!name) return;
    try {
      await toast.promise(
        api.post('/collections', { name, workspaceId: currentWorkspace._id }).then(() => fetchCollections()),
        {
          loading: 'Creating collection...',
          success: 'Collection created!',
          error: 'Failed to create collection'
        }
      );
    } catch (err) {
      // Error handled by toast.promise
    }
  };

  const handleHistoryClick = (item) => {
    const historyTabId = `history_${item._id}`;
    const existingTab = tabs.find(t => t.id === historyTabId);

    if (!existingTab) {
      const newTab = {
        id: historyTabId,
        title: item.url,
        method: item.method,
        url: item.url,
        headers: item.headers?.length ? item.headers : [{ key: '', value: '', isActive: true }],
        queryParams: item.queryParams?.length ? item.queryParams : [{ key: '', value: '', isActive: true }],
        body: {
          mode: item.bodyMode || 'json',
          content: item.bodyContent || '{\n  \n}'
        }
      };
      setTabs([...tabs, newTab]);
    }

    setActiveTabId(historyTabId);

    if (item.responseData) {
      setResponseData(prev => ({
        ...prev,
        [historyTabId]: {
          status: item.status,
          statusText: item.status >= 200 && item.status < 300 ? 'OK' : 'Error',
          timeTaken: item.timeTaken,
          data: item.responseData,
          headers: item.responseHeaders || {}
        }
      }));
    }

    if (item.aiAnalysis) {
      setResponseAi(prev => ({
        ...prev,
        [historyTabId]: item.aiAnalysis
      }));
    }

    setLatestHistoryId(prev => ({
      ...prev,
      [historyTabId]: item._id
    }));
  };

  const handleSavedRequestClick = (req) => {
    const reqTabId = `req_${req._id}`;
    const existingTab = tabs.find(t => t.id === reqTabId);

    if (!existingTab) {
      const newTab = {
        id: reqTabId,
        title: req.name || req.url,
        method: req.method,
        url: req.url,
        collectionId: req.collectionId,
        updatedBy: req.updatedBy,
        headers: req.headers?.length ? req.headers : [{ key: '', value: '', isActive: true }],
        queryParams: req.queryParams?.length ? req.queryParams : [{ key: '', value: '', isActive: true }],
        body: {
          mode: req.body?.type || 'json',
          content: req.body?.content || '{\n  \n}'
        }
      };
      setTabs([...tabs, newTab]);
      if (req.lastResponse) {
        setResponseData(prev => ({
          ...prev,
          [reqTabId]: {
            status: req.lastResponse.status,
            timeTaken: req.lastResponse.timeTaken,
            data: req.lastResponse.data,
            headers: req.lastResponse.headers
          }
        }));
      }

      if (req.aiAnalysis) {
        setResponseAi(prev => ({
          ...prev,
          [reqTabId]: req.aiAnalysis
        }));
      }

    } else {
      setActiveTabId(reqTabId);
    }
  };

  const handleDeleteCollection = async (e, collectionId) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeletingRef.current) return;
    const isConfirmed = await confirm("Delete Collection", "Are you sure you want to delete this collection and all its requests?", { isDanger: true, confirmText: 'Delete' });
    if (!isConfirmed) return;

    isDeletingRef.current = true;

    try {
      await toast.promise(
        api.delete(`/collections/${collectionId}`).then(async (res) => {
          if (res.status === 200 || res.status === 204) {
            await fetchCollections();
          } else {
            throw new Error("Delete failed");
          }
        }),
        {
          loading: 'Deleting collection...',
          success: 'Collection deleted!',
          error: (err) => err.response?.data?.message || err.message || 'Failed to delete collection',
        }
      );
    } catch (err) {
      console.error("Delete Collection Error:", err);
    } finally {
      isDeletingRef.current = false;
    }
  };

  const handleDeleteRequest = async (e, reqId) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeletingRef.current) return;
    const isConfirmed = await confirm("Delete Request", "Are you sure you want to delete this request?", { isDanger: true, confirmText: 'Delete' });
    if (!isConfirmed) return;

    isDeletingRef.current = true;

    try {
      await toast.promise(
        api.delete(`/requests/${reqId}`).then(async (res) => {
          if (res.status === 200 || res.status === 204) {
            await fetchCollections();
          } else {
            throw new Error("Delete failed");
          }
        }),
        {
          loading: 'Deleting request...',
          success: 'Request deleted!',
          error: (err) => err.response?.data?.message || err.message || 'Failed to delete request',
        }
      );

      const reqTabId = `req_${reqId}`;
      let newTabs = tabs.filter(t => t.id !== reqTabId);

      if (newTabs.length === 0) {
        newTabs = [{ id: 'new', title: 'Untitled Request', isNew: true }];
      }

      setTabs(newTabs);
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } catch (err) {
      console.error("Delete Request Error:", err);
    } finally {
      isDeletingRef.current = false;
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDeletingRef.current) return;
    const isConfirmed = await confirm("Delete History", "Are you sure you want to delete this history item?", { isDanger: true, confirmText: 'Delete' });
    if (!isConfirmed) return;

    isDeletingRef.current = true;
    try {
      await toast.promise(
        api.delete(`/history/${id}`).then(async (res) => {
          if (res.status === 200 || res.status === 204) {
            await fetchHistory();
          } else {
            throw new Error("Delete failed");
          }
        }),
        {
          loading: 'Deleting history...',
          success: 'History deleted!',
          error: 'Failed to delete history'
        }
      );
    } catch (err) {
      console.error("Delete History Error:", err);
    } finally {
      isDeletingRef.current = false;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-72 flex-shrink-0 bg-card border-r border-border flex flex-col h-full font-sans transition-all duration-300 z-[100]
        fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur top-0 sticky z-10">
          <span className="font-bold text-xl flex items-center gap-2 tracking-tight">
            <div className="w-7 h-7 overflow-hidden">
              <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-foreground">Smart</span><span className="text-primary -ml-1">Post</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-border relative">
          <div
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="bg-background rounded-lg p-2 px-3 border border-border flex items-center justify-between cursor-pointer hover:border-accent transition-colors"
          >
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Workspace</span>
              <span className="text-sm font-medium text-foreground truncate">{currentWorkspace?.name || 'Loading...'}</span>
            </div>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showWorkspaceMenu ? 'rotate-180' : ''}`} />
          </div>

          {/* Workspace Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute top-full left-3 right-3 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden transform origin-top animate-dropdown border-b border-background">
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {workspaces.map((w) => (
                  <button
                    key={w._id}
                    onClick={() => {
                      setCurrentWorkspace(w);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors ${currentWorkspace?._id === w._id ? 'text-primary font-semibold bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <div className="w-4 flex-shrink-0 flex justify-center">
                      {currentWorkspace?._id === w._id && <Check size={14} />}
                    </div>
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-border bg-card/80 p-1 flex flex-col">
                <button onClick={() => { setShowWorkspaceSettings(true); setShowWorkspaceMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors rounded">
                  <Settings size={14} className="text-muted-foreground" /> Manage Current Workspace
                </button>
                <button onClick={handleCreateWorkspace} className="w-full text-left px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors rounded">
                  <Plus size={14} className="text-muted-foreground" /> Create New Workspace
                </button>
                <button onClick={handleJoinWorkspace} className="w-full text-left px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors rounded">
                  <KeyRound size={14} className="text-muted-foreground" /> Join Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex border-b border-border text-sm">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'collections' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Folder size={16} /> Collections
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'history' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <div className="flex items-center justify-center gap-2">
              <History size={16} /> History
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full max-h-[calc(100vh-220px)] custom-scrollbar">
          {activeTab === 'collections' ? (
            <div className="p-2 space-y-1">
              <div className="p-2 flex items-center justify-between text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                <span>Saved Requests</span>
                <button onClick={handleCreateCollection} className="hover:text-primary hover:bg-primary/10 p-1 rounded transition-colors" title="New Collection"><Plus size={14} /></button>
              </div>
              {collections.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground mt-4 border border-dashed border-border rounded-lg mx-2">
                  No collections yet.<br /><span onClick={handleCreateCollection} className="text-primary cursor-pointer hover:text-primary-foreground">Create one</span> to save requests.
                </div>
              ) : (
                collections.map(c => (
                  <div key={c._id} className="mb-2">
                    <div className="p-2 rounded hover:bg-accent cursor-pointer flex items-center text-sm text-foreground transition-colors group/col">
                      <ChevronRight size={14} className="text-muted-foreground mr-2" />
                      <Folder size={14} className="text-primary/70 mr-2" />
                      <span className="truncate flex-1 font-medium">{c.name}</span>
                      <button onClick={(e) => handleDeleteCollection(e, c._id)} className="opacity-0 group-hover/col:opacity-100 p-1 hover:bg-destructive/20 hover:text-destructive text-muted-foreground rounded transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="pl-6 border-l border-border flex flex-col gap-1 ml-3 mt-1">
                      {savedRequests.filter(r => r.collectionId === c._id).map(req => (
                        <div key={req._id} onClick={() => handleSavedRequestClick(req)} className="p-1.5 rounded hover:bg-accent cursor-pointer flex items-center gap-2 text-xs transition-colors group/req">
                          <span className={`font-mono font-bold text-[10px] ${req.method === 'GET' ? 'text-primary' : req.method === 'POST' ? 'text-secondary' : req.method === 'DELETE' ? 'text-destructive' : 'text-primary/70'}`}>
                            {req.method}
                          </span>
                          <span className="truncate flex-1 text-muted-foreground group-hover/req:text-foreground transition-colors">{req.name}</span>
                          <button onClick={(e) => handleDeleteRequest(e, req._id)} className="opacity-0 group-hover/req:opacity-100 p-1 hover:bg-destructive/20 hover:text-destructive text-muted-foreground rounded transition-all">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="p-2 flex items-center text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                <span>Recent Activity</span>
              </div>
              {history.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground mt-4 border border-dashed border-border rounded-lg mx-2">
                  No recent requests.
                </div>
              ) : (
                history.map((h, i) => (
                  <div key={i} onClick={() => handleHistoryClick(h)} className="p-2 rounded hover:bg-accent cursor-pointer text-xs transition-colors group relative">
                    <div className="flex items-center gap-2 mb-1 pr-6">
                      <span className={`font-mono font-bold ${h.method === 'GET' ? 'text-primary' : h.method === 'POST' ? 'text-secondary' : h.method === 'DELETE' ? 'text-destructive' : 'text-primary/70'}`}>
                        {h.method}
                      </span>
                      <span className="truncate flex-1 text-foreground group-hover:text-foreground transition-colors">{h.url}</span>
                      <div className="flex items-center gap-1">
                        {h.aiAnalysis && <Bot size={12} className="text-primary" title="AI Analysis Attached" />}
                        {h.performanceMetrics && <Activity size={12} className="text-secondary" title="Performance Metrics Attached" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pr-6">
                      <span className={h.status >= 200 && h.status < 300 ? 'text-primary/70' : 'text-destructive/70'}>{h.status} {h.status >= 200 && h.status < 300 ? 'OK' : 'ERR'}</span>
                      <span>{h.timeTaken}ms</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(e, h._id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/20 hover:text-destructive text-muted-foreground rounded transition-all"
                      title="Delete history item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Subscription Status Area */}
        <div className="p-4 border-t border-border bg-card shrink-0">
          {!user?.isSubscribed ? (
            <div className="mb-3 p-3 rounded-lg bg-background border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Free Plan</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{user?.performanceTestCount || 0}/4 Tests Used</span>
              </div>
              <div className="w-full bg-accent rounded-full h-1.5 mb-3">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((user?.performanceTestCount || 0) / 4) * 100, 100)}%` }}
                ></div>
              </div>
              <button
                onClick={handleUpgrade}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2 rounded-lg transition-colors shadow-sm flex justify-center items-center gap-1"
              >
                Upgrade to Pro — ₹100/yr
              </button>
            </div>
          ) : (
            <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check size={14} className="text-primary-foreground" />
                </div>
                <span className="text-sm font-bold text-primary">Pro Plan Active</span>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-3 mb-4 p-2 rounded-lg bg-background border ${user?.isSubscribed ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.15)] relative overflow-hidden' : 'border-border'}`}>
            {user?.isSubscribed && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            )}
            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm shadow-sm ring-1 overflow-hidden ${user?.isSubscribed ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground ring-primary/50' : 'bg-primary text-primary-foreground ring-border'}`}>
              {user?.photo && user.photo !== 'default.jpg' ? (
                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col overflow-hidden relative z-10">
              <span className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                {user?.name}
                {user?.isSubscribed && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-600 text-white px-1.5 py-0.5 rounded-sm shadow-sm" title="Pro User">
                    PRO
                  </span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground truncate font-mono">{user?.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettingsModal(true)} className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 rounded-lg transition-colors border border-border">
              <Settings size={14} /> Settings
            </button>
            <button onClick={() => logout(workspaces)} className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground border border-border py-2 rounded-lg transition-colors">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

      </aside>

      {/* Settings Modal - Moved outside aside to fix stacking context issues */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleUpdateProfile} className="bg-background border border-border rounded-lg p-4 shadow-inner">
                <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Profile Information</h4>

                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border mb-3 bg-card flex items-center justify-center text-3xl font-bold text-muted-foreground relative">
                    {photoPreview && photoPreview !== 'default.jpg' ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer text-[10px] font-bold uppercase bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-sm">
                      <Camera size={12} />
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                        id="profilePhotoUpload"
                        name="profilePhotoUpload"
                        aria-label="Upload Profile Photo"
                      />
                    </label>
                    {photoPreview && photoPreview !== 'default.jpg' && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[10px] font-bold uppercase bg-destructive/10 hover:bg-destructive/20 text-destructive px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2">Max size: 2MB</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="profileName" className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-wider">Name *</label>
                    <input
                      required
                      type="text"
                      id="profileName"
                      name="profileName"
                      className="w-full bg-card border border-border text-foreground text-sm rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="profileEmail" className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-wider">Email Address (Read-only)</label>
                    <input
                      disabled
                      type="email"
                      id="profileEmail"
                      name="profileEmail"
                      className="w-full bg-card/50 border border-border text-muted-foreground text-sm font-mono rounded px-2 py-1.5 focus:outline-none cursor-not-allowed select-none"
                      value={profileForm.email}
                      title="Your email address cannot be changed"
                    />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <label htmlFor="profileBio" className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-wider">Bio (Optional)</label>
                    <textarea
                      id="profileBio"
                      name="profileBio"
                      className="w-full bg-card border border-border text-foreground text-sm rounded px-2 py-1.5 focus:outline-none focus:border-primary resize-none h-16"
                      value={profileForm.bio}
                      placeholder="A short bio about yourself..."
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label htmlFor="profileCompany" className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-wider">Company (Optional)</label>
                      <input
                        type="text"
                        id="profileCompany"
                        name="profileCompany"
                        className="w-full bg-card border border-border text-foreground text-sm rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                        value={profileForm.company}
                        placeholder="e.g. Acme Corp"
                        onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="profileTitle" className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5 tracking-wider">Title (Optional)</label>
                      <input
                        type="text"
                        id="profileTitle"
                        name="profileTitle"
                        className="w-full bg-card border border-border text-foreground text-sm rounded px-2 py-1.5 focus:outline-none focus:border-primary"
                        value={profileForm.title}
                        placeholder="e.g. Developer"
                        onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium py-1.5 px-4 rounded transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    Save Changes
                  </button>
                </div>
              </form>

              <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4">
                <h4 className="text-xs font-bold text-destructive mb-2 uppercase tracking-wider">Danger Zone</h4>
                <p className="text-xs text-destructive/80 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full bg-destructive/10 hover:bg-destructive/50 text-destructive font-bold tracking-tight py-2 rounded-lg transition-colors text-sm shadow-md border border-destructive/20"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Settings Modal - Moved outside aside */}
      {showWorkspaceSettings && (
        <WorkspaceSettingsModal onClose={() => setShowWorkspaceSettings(false)} />
      )}
    </>
  );
};

export default Sidebar;
