import React, { useState, useEffect } from 'react';
import { X, Copy, Users, LogOut, KeyRound, ShieldAlert, Check } from 'lucide-react';
import api from '../utils/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDialog } from '../context/DialogContext';

const WorkspaceSettingsModal = ({ onClose }) => {
  const { currentWorkspace, fetchWorkspaces } = useWorkspace();
  const { user, handleUpgrade } = useAuth();
  const { confirm } = useDialog();
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  // Log when currentWorkspace changes (especially joinCode)
  useEffect(() => {
    console.log('[WorkspaceSettingsModal] currentWorkspace updated:', {
      name: currentWorkspace?.name,
      joinCode: currentWorkspace?.joinCode,
      membersCount: currentWorkspace?.members?.length
    });
  }, [currentWorkspace]);

  // If no workspace selected, just return null
  if (!currentWorkspace) return null;

  const ownerId = typeof currentWorkspace.owner === 'object' ? currentWorkspace.owner?._id : currentWorkspace.owner;
  const isAdmin = ownerId === user?._id;

  const handleCopyCode = async () => {
    if (!currentWorkspace.joinCode) return;
    try {
      await navigator.clipboard.writeText(currentWorkspace.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Join code copied!');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleGenerateCode = async () => {
    if (!user?.isSubscribed) {
      const wantUpgrade = await confirm(
        "Pro Feature", 
        "Inviting team members to collaborate is a Pro feature. Upgrade to share your workspace.", 
        { confirmText: "Upgrade to Pro — ₹100/yr", confirmColor: "bg-primary" }
      );
      if (wantUpgrade) {
        onClose();
        handleUpgrade();
      }
      return;
    }
    setLoadingCode(true);
    try {
      console.log('[WorkspaceSettingsModal] Generating code for workspace:', currentWorkspace._id);
      await toast.promise(
        api.post(`/workspaces/${currentWorkspace._id}/generate-code`),
        {
          loading: 'Generating new code...',
          success: 'New join code generated!',
          error: 'Failed to generate code'
        }
      );
      // Workspace context socket will pick up 'workspace_updated' and fetch Workspaces again, so UI updates automatically.
      console.log('[WorkspaceSettingsModal] Code generated, waiting for socket update...');
      
      // Also refetch after a short delay to ensure socket event is processed
      setTimeout(() => {
        console.log('[WorkspaceSettingsModal] Calling fetchWorkspaces as fallback');
        fetchWorkspaces();
      }, 500);
    } catch (err) { 
      console.error('[WorkspaceSettingsModal] Generate code error:', err);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    // Find the member being removed to show their name
    const memberToRemove = currentWorkspace.members.find(m => m.user._id === memberId);
    const memberName = memberToRemove?.user?.name || 'Member';
    
    try {
      await toast.promise(
        api.delete(`/workspaces/${currentWorkspace._id}/members/${memberId}`),
        {
          loading: `Removing ${memberName}...`,
          success: `${memberName} has been removed from the workspace!`,
          error: `Failed to remove ${memberName}`
        }
      );
    } catch (err) { }
  };

  const handleLeaveWorkspace = async () => {
    try {
      await toast.promise(
        api.post(`/workspaces/${currentWorkspace._id}/leave`),
        {
          loading: 'Leaving workspace...',
          success: 'Left workspace successfully!',
          error: 'Failed to leave workspace'
        }
      );
      onClose();
      fetchWorkspaces();
    } catch (err) { }
  };

  const handleDeleteWorkspace = async () => {
    const isConfirmed = await confirm("Delete Workspace", `Are you absolutely sure you want to delete "${currentWorkspace.name}"? This will delete all collections, requests, and history inside it.`, { isDanger: true, confirmText: 'Delete' });
    if (!isConfirmed) return;

    try {
      await toast.promise(
        api.delete(`/workspaces/${currentWorkspace._id}`),
        {
          loading: 'Deleting workspace...',
          success: 'Workspace deleted forever!',
          error: 'Failed to delete workspace'
        }
      );
      onClose();
      fetchWorkspaces();
    } catch (err) { }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground tracking-tight">
            <Users size={20} className="text-primary" /> Workspace Settings
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X size={20} />
          </button>
        </div>
 
        <div className="space-y-6 flex-1">
          {/* Workspace Info */}
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <div className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider">Current Workspace</div>
            <div className="text-foreground text-lg font-bold">{currentWorkspace.name}</div>
          </div>
 
          {/* Join Code Section */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <KeyRound size={16} className="text-secondary" /> Collaboration
            </h4>
            <div className="flex items-center gap-3">
              <div className="bg-card border border-border rounded px-4 py-2 flex-1 font-mono text-center tracking-widest text-lg text-primary font-bold select-all">
                {currentWorkspace.joinCode || '------'}
              </div>
              {currentWorkspace.joinCode && (
                <button
                  onClick={handleCopyCode}
                  className="bg-muted hover:bg-muted/80 text-foreground p-2.5 rounded transition-colors border border-border"
                  title="Copy Code"
                >
                  {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
                </button>
              )}
            </div>
 
            {isAdmin && (
              <button
                onClick={handleGenerateCode}
                disabled={loadingCode}
                className="mt-3 w-full text-xs bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground py-2 rounded font-medium border border-secondary/30 transition-colors"
              >
                {currentWorkspace.joinCode ? 'Regenerate Code' : 'Generate Join Code'}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
              Share this code with your team to allow them to join and collaborate in real-time.
            </p>
          </div>
 
          {/* Members List */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 ml-1">Members ({currentWorkspace.members?.length || 0})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {currentWorkspace.members?.map((member) => {
                const isMe = member.user?._id === user?._id;
                const isMemberAdmin = member.role === 'admin';
                return (
                  <div key={member._id || member.user._id} className="bg-muted/20 border border-border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-muted flex flex-shrink-0 items-center justify-center font-bold text-xs text-muted-foreground ring-1 ring-border">
                        {member.user?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                          {member.user?.name} {isMe && <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded ml-1 border border-border">You</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate font-mono">{member.user?.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isMemberAdmin ? 'bg-secondary/20 text-secondary-foreground border border-secondary/30' : 'bg-muted text-muted-foreground'}`}>
                        {member.role}
                      </span>
                      {isAdmin && !isMe && !isMemberAdmin && (
                        <button onClick={() => handleRemoveMember(member.user._id)} className="text-[10px] text-destructive hover:underline mt-1">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
 
        {/* Leave / Delete Workspace Action */}
        <div className="mt-6 pt-4 border-t border-border">
          {!isAdmin ? (
            <button
              onClick={handleLeaveWorkspace}
              className="flex w-full items-center justify-center gap-2 text-sm text-destructive bg-destructive/10 hover:bg-destructive/20 py-2 rounded border border-destructive/30 transition-colors font-medium"
            >
              <LogOut size={16} /> Leave Workspace
            </button>
          ) : (
            <button
              onClick={handleDeleteWorkspace}
              className="flex w-full items-center justify-center gap-2 text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 py-2 rounded border border-destructive/20 transition-colors font-bold tracking-tight shadow-sm"
            >
              <ShieldAlert size={16} /> Delete Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsModal;
