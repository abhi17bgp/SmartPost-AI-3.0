import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/axiosInstance';
import { useAuth } from './AuthContext';
import { useDialog } from './DialogContext';
import { io } from 'socket.io-client';

const WorkspaceContext = createContext({
  workspaces: [],
  fetchWorkspaces: () => {},
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  collections: [],
  savedRequests: [],
  fetchCollections: () => {},
  history: [],
  setHistory: () => {},
  fetchHistory: () => {},
  tabs: [],
  setTabs: () => {},
  activeTabId: null,
  setActiveTabId: () => {},
  responseData: {},
  setResponseData: () => {},
  responseLoading: {},
  setResponseLoading: () => {},
  responseAi: {},
  setResponseAi: () => {},
  responseAiLoading: {},
  setResponseAiLoading: () => {},
  latestHistoryId: null,
  setLatestHistoryId: () => {},
  typingUsers: {},
  socket: null,
  performanceModalOpen: false,
  setPerformanceModalOpen: () => {},
  performanceViewState: 'normal', // 'normal', 'maximized', 'minimized'
  setPerformanceViewState: () => {}
});

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const { alert: dialogAlert } = useDialog();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [collections, setCollections] = useState([]);
  const [savedRequests, setSavedRequests] = useState([]);
  const [history, setHistory] = useState([]);

  // Tabs representing open requests in the main pane
  const [tabs, setTabs] = useState([{ id: 'new', title: 'Untitled Request', isNew: true }]);
  const [activeTabId, setActiveTabId] = useState('new');

  // Shared Response State for tabs
  const [responseData, setResponseData] = useState({});
  const [responseLoading, setResponseLoading] = useState({});
  const [responseAi, setResponseAi] = useState({});

  // Real-time typing tracking (key: requestId, value: { userName, timeout })
  const [typingUsers, setTypingUsers] = useState({});
  const [responseAiLoading, setResponseAiLoading] = useState({});
  const [latestHistoryId, setLatestHistoryId] = useState({});

  // Socket reference
  const [socket, setSocket] = useState(null);

  // Performance Modal State
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [performanceViewState, setPerformanceViewState] = useState('normal');

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/workspaces');
      if (res.data.data.workspaces.length > 0) {
        const newWorkspaces = res.data.data.workspaces;
        setWorkspaces(newWorkspaces);
        setCurrentWorkspace(prev => {
          if (!prev) return newWorkspaces[0];
          const refreshed = newWorkspaces.find(w => w._id?.toString() === prev._id?.toString());
          // Only update if we found it, to avoid unnecessary reference changes if nothing changed.
          return refreshed || newWorkspaces[0];
        });
      } else {
        const createRes = await api.post('/workspaces', { name: 'My Workspace' });
        const newWorkspace = createRes.data.data.workspace;
        setWorkspaces([newWorkspace]);
        setCurrentWorkspace(newWorkspace);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces', err);
    }
  }, [user]);

  const fetchCollections = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const res = await api.get(`/collections?workspaceId=${currentWorkspace._id}`);
      setCollections(res.data.data.collections || []);
      setSavedRequests(res.data.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch collections', err);
    }
  }, [currentWorkspace]);

  const fetchHistory = useCallback(async () => {
    if (!user || !currentWorkspace) return;
    try {
      const res = await api.get(`/history?workspaceId=${currentWorkspace._id}`);
      setHistory(res.data.data.history || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchCollections();
      fetchHistory();
    }
  }, [currentWorkspace, fetchCollections, fetchHistory]);

  // Socket setup
  useEffect(() => {
    if (!user) {
      if (socket) socket.disconnect();
      return;
    }

    try {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        withCredentials: true
      });
      setSocket(newSocket);
    } catch (error) {
      console.error('[WorkspaceProvider] Socket initialization error:', error);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !currentWorkspace) return;

    socket.emit('join_workspace', {
      workspaceId: currentWorkspace._id,
      userId: user?._id,
      userName: user?.name
    });

    const onUpdate = () => {
      fetchCollections();
    };

    const onHistoryUpdate = () => {
      fetchHistory();
    };

    const onWorkspaceUpdate = (updatedWorkspace) => {
      console.log('[WorkspaceContext] Workspace updated event:', updatedWorkspace);
      
      // If the updated workspace is the current one, update it immediately
      if (updatedWorkspace && updatedWorkspace._id?.toString() === currentWorkspace._id?.toString()) {
        console.log('[WorkspaceContext] Current workspace updated, refreshing immediately');
        setCurrentWorkspace(updatedWorkspace);
      }
      
      // Always refetch to stay in sync
      fetchWorkspaces();
    };

    const onMemberRemoved = async (data) => {
      console.log('[WorkspaceContext] Member removed event:', data);
      
      if (data.userId === user._id && data.workspaceId?.toString() === currentWorkspace._id?.toString()) {
        // This user was removed from the workspace
        const message = data.removedByName 
          ? `You have been removed from "${data.workspaceName}" by ${data.removedByName}.`
          : `You have been removed from "${data.workspaceName}".`;
          
        if (dialogAlert) {
          await dialogAlert('Workspace Access Revoked', message, { isDanger: true });
        } else {
          alert(message);
        }
        fetchWorkspaces(); // Will switch workspace if current is unavailable
      } else if (data.workspaceId?.toString() === currentWorkspace._id?.toString()) {
        // Someone else was removed from this workspace - refresh to show updated member list
        console.log('[WorkspaceContext] Another member was removed, refreshing workspace data');
        fetchWorkspaces();
        
        // Show notification to other members about the removal
        if (data.removedBy !== user._id) {
          // Only show if someone else performed the removal
          toast.success(`${data.removedByName || 'Admin'} removed a member from the workspace`);
        }
      }
    };

    const onMemberLeft = (data) => {
      console.log('[WorkspaceContext] Member left event:', data);
      if (data.workspaceId?.toString() !== currentWorkspace._id?.toString()) return;
      if (data.userId === user._id) return; // ignore self if still in room briefly

      fetchWorkspaces();
      toast.success(`${data.userName || 'A member'} left the workspace.`);
    };

    const onMemberJoined = (data) => {
      console.log('[WorkspaceContext] Member joined event:', data);
      if (data.workspaceId?.toString() !== currentWorkspace._id?.toString()) return;
      if (data.userId === user._id) return; // ignore self if just joined

      fetchWorkspaces();
      toast.success(`${data.userName || 'A member'} joined the workspace.`);
    };

    socket.on('collection_updated', onUpdate);
    socket.on('collection_deleted', onUpdate);
    socket.on('request_updated', onUpdate);
    socket.on('request_deleted', onUpdate);

    socket.on('history_added', onHistoryUpdate);
    socket.on('history_updated', onHistoryUpdate);
    socket.on('history_deleted', onHistoryUpdate);
    socket.on('history_cleared', onHistoryUpdate);

    socket.on('workspace_updated', onWorkspaceUpdate);
    socket.on('member_removed', onMemberRemoved);
    socket.on('member_left', onMemberLeft);
    socket.on('member_joined', onMemberJoined);

    const onTyping = ({ userName, requestId }) => {
      setTypingUsers(prev => {
        const newDict = { ...prev };
        if (newDict[requestId]?.timeout) clearTimeout(newDict[requestId].timeout);
        newDict[requestId] = {
          userName,
          timeout: setTimeout(() => {
            setTypingUsers(current => {
              const updated = { ...current };
              delete updated[requestId];
              return updated;
            });
          }, 3000) // Clear after 3 seconds of inactivity
        };
        return newDict;
      });
    };

    const onStopTyping = ({ requestId }) => {
      setTypingUsers(prev => {
        const newDict = { ...prev };
        if (newDict[requestId]) {
          clearTimeout(newDict[requestId].timeout);
          delete newDict[requestId];
        }
        return newDict;
      });
    };

    socket.on('user_typing_request', onTyping);
    socket.on('user_stopped_typing', onStopTyping);

    return () => {
      socket.emit('leave_workspace', currentWorkspace._id);
      socket.off('collection_updated', onUpdate);
      socket.off('collection_deleted', onUpdate);
      socket.off('request_updated', onUpdate);
      socket.off('request_deleted', onUpdate);
      socket.off('history_added', onHistoryUpdate);
      socket.off('history_updated', onHistoryUpdate);
      socket.off('history_deleted', onHistoryUpdate);
      socket.off('history_cleared', onHistoryUpdate);
      socket.off('workspace_updated', onWorkspaceUpdate);
      socket.off('member_removed', onMemberRemoved);
      socket.off('member_left', onMemberLeft);
      socket.off('member_joined', onMemberJoined);
      socket.off('user_typing_request', onTyping);
      socket.off('user_stopped_typing', onStopTyping);
    };

  }, [socket, currentWorkspace]);

  // BroadcastChannel listener for USER_LOGOUT events
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    const channelName = `workspace_${currentWorkspace._id}`;
    const bc = new BroadcastChannel(channelName);

    const handleUserLogout = (event) => {
      const { type, userId, userName } = event.data;
      
      if (type === 'USER_LOGOUT') {
        console.log('[WorkspaceContext] 🔓 User logout event received:', { userId, userName });
        
        // Don't show notification for self logout
        if (userId === user._id) {
          console.log('[WorkspaceContext] Ignoring own logout');
          bc.close();
          return;
        }

        // Refresh workspace to update member list
        fetchWorkspaces();
        toast.success(`${userName || 'A member'} logged out.`);
      }
    };

    const handleWorkspaceLogout = (event) => {
      const payload = event.detail;
      if (!payload || !payload.workspaces || !socket) return;

      const workspaceIds = payload.workspaces.map(w => w._id?.toString()).filter(Boolean);
      if (workspaceIds.length === 0) return;

      console.log('[WorkspaceContext] 🚪 Sending logout socket event for workspaces:', workspaceIds);
      socket.emit('user_logout', {
        workspaceIds,
        userId: payload.userId,
        userName: payload.userName
      });
    };

    bc.addEventListener('message', handleUserLogout);
    window.addEventListener('workspace_logout', handleWorkspaceLogout);

    return () => {
      bc.removeEventListener('message', handleUserLogout);
      bc.close();
      window.removeEventListener('workspace_logout', handleWorkspaceLogout);
    };
  }, [currentWorkspace, user, fetchWorkspaces, socket]);

  const value = {
    workspaces,
    fetchWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    collections,
    savedRequests,
    fetchCollections,
    history,
    setHistory,
    fetchHistory,
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    responseData,
    setResponseData,
    responseLoading,
    setResponseLoading,
    responseAi,
    setResponseAi,
    responseAiLoading,
    setResponseAiLoading,
    latestHistoryId,
    setLatestHistoryId,
    typingUsers,
    socket,
    performanceModalOpen,
    setPerformanceModalOpen,
    performanceViewState,
    setPerformanceViewState
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
