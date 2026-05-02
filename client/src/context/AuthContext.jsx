import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/axiosInstance';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const broadcastChannelRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize BroadcastChannel for real-time cross-tab communication
  useEffect(() => {
    console.log('[AuthContext] Initializing BroadcastChannel');
    
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('auth_channel');
        broadcastChannelRef.current = channel;
        console.log('[AuthContext] ✅ BroadcastChannel created successfully');

        // Listen for messages from other tabs
        const handleMessage = (event) => {
          const message = event.data;
          console.log('[AuthContext] 📨 Received broadcast message:', message);

          const { type, user: syncedUser, token } = message;

          if (type === 'LOGIN') {
            console.log('[AuthContext] 🔄 Syncing LOGIN from another tab');
            setUser(syncedUser);
            localStorage.setItem('user', JSON.stringify(syncedUser));
            localStorage.setItem('token', token);
            localStorage.setItem('token_set_time', Date.now().toString());
            toast.success(`${syncedUser?.name || 'User'} logged in on another tab`);
          } else if (type === 'LOGOUT') {
            console.log('[AuthContext] 🔄 Syncing LOGOUT from another tab');
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('token_set_time');
            toast.success('Logged out from another tab');
          } else if (type === 'UPDATE_PROFILE') {
            console.log('[AuthContext] 🔄 Syncing UPDATE_PROFILE from another tab');
            setUser(syncedUser);
            localStorage.setItem('user', JSON.stringify(syncedUser));
            toast.success('Profile updated from another tab');
          }
        };

        channel.addEventListener('message', handleMessage);

        return () => {
          channel.removeEventListener('message', handleMessage);
          channel.close();
        };
      } catch (err) {
        console.error('[AuthContext] ❌ BroadcastChannel error:', err);
      }
    } else {
      console.warn('[AuthContext] ⚠️ BroadcastChannel not supported - will use storage events only');
    }
  }, []);

  // Listen to localStorage changes from other tabs (fallback + always reliable)
  useEffect(() => {
    console.log('[AuthContext] Setting up localStorage listener');
    
    const handleStorageChange = (e) => {
      // Skip if this is our own tab's change
      if (e.key === 'user' && e.newValue) {
        console.log('[AuthContext] 📨 Storage event - user changed (from another tab)');
        try {
          const syncedUser = JSON.parse(e.newValue);
          setUser(syncedUser);
          console.log('[AuthContext] ✅ User synced from localStorage:', syncedUser.name);
        } catch (err) {
          console.error('[AuthContext] Error parsing user from storage:', err);
        }
      } else if (e.key === 'user' && !e.newValue) {
        console.log('[AuthContext] 📨 Storage event - user cleared (from another tab)');
        setUser(null);
      } else if (e.key === 'token' && !e.newValue) {
        console.log('[AuthContext] 📨 Storage event - token cleared (from another tab)');
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Initialize user from localStorage on app start
  useEffect(() => {
    console.log('[AuthContext] Initializing from localStorage');
    
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('[AuthContext] ✅ Loaded user from localStorage:', userData.name);
      } catch (err) {
        console.error('[AuthContext] Error parsing stored user:', err);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('token_set_time');
      }
    } else {
      console.log('[AuthContext] ℹ️ No stored user found');
    }
    
    setLoading(false);
    isInitializedRef.current = true;
  }, []);

  // Periodic cross-device sync: refetch user profile every 5 min + on window focus
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const freshUser = res.data.data.user;
        // Only update if something actually changed
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (JSON.stringify(freshUser) !== JSON.stringify(storedUser)) {
          console.log('[AuthContext] 🔄 Cross-device sync: user data updated');
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }
      } catch (err) {
        // Silently fail — user might be offline or token expired
        console.log('[AuthContext] ℹ️ Profile sync skipped:', err.message);
      }
    };

    // Sync on window focus (user switches back to this tab/window)
    const handleFocus = () => syncProfile();
    window.addEventListener('focus', handleFocus);

    // Sync every 5 minutes
    const interval = setInterval(syncProfile, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user]);

  // Debug: Log user state changes
  useEffect(() => {
    console.log('[AuthContext] User state changed:', user ? `Logged in as ${user.name}` : 'Not logged in');
  }, [user]);

  const login = async (credentials) => {
    try {
      console.log('[AuthContext] 🔐 Login initiated');
      const res = await api.post('/auth/login', credentials);
      const userData = res.data.data.user;
      const token = res.data.token;
      
      console.log('[AuthContext] ✅ Login successful:', userData.name);
      
      // Update local state
      setUser(userData);
      
      // Store in localStorage (this will trigger storage events in other tabs)
      console.log('[AuthContext] 💾 Saving to localStorage');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      localStorage.setItem('token_set_time', Date.now().toString());

      // Broadcast login to all other OPEN tabs (for instant notification)
      if (broadcastChannelRef.current) {
        console.log('[AuthContext] 📢 Broadcasting LOGIN to other tabs:', { userName: userData.name, tokenLength: token.length });
        broadcastChannelRef.current.postMessage({
          type: 'LOGIN',
          user: userData,
          token
        });
      } else {
        console.log('[AuthContext] ℹ️ BroadcastChannel not available, relying on storage events');
      }

      console.log('[AuthContext] ✨ Login complete');
      return userData;
    } catch (error) {
      console.error('[AuthContext] ❌ Login error:', error);
      throw error;
    }
  };

  const register = async (credentials) => {
    return await api.post('/auth/register', credentials);
  };

  const logout = async (workspacesToLeave = []) => {
    try {
      console.log('[AuthContext] 🔓 Logout initiated');
      
      // Notify server via socket for cross-browser admin notifications
      if (workspacesToLeave && workspacesToLeave.length > 0) {
        console.log('[AuthContext] 📤 Notifying workspaces about logout:', workspacesToLeave.length);
        try {
          if (window && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('workspace_logout', {
              detail: {
                workspaces: workspacesToLeave,
                userId: user?._id,
                userName: user?.name
              }
            }));
          }
        } catch (err) {
          console.log('[AuthContext] Workspace logout notification error:', err);
        }
      }
      
      await toast.promise(
        api.post('/auth/logout'),
        {
          loading: 'Logging out...',
          success: 'Successfully logged out!',
          error: 'Error logging out'
        }
      );
    } catch (err) {
      console.error('[AuthContext] ❌ Logout API error:', err);
    } finally {
      console.log('[AuthContext] 🧹 Clearing auth state');
      
      // Update local state
      setUser(null);
      
      // Clear localStorage (this will trigger storage events in other tabs)
      console.log('[AuthContext] 💾 Removing from localStorage');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('token_set_time');

      // Broadcast logout to all other OPEN tabs (for instant notification)
      if (broadcastChannelRef.current) {
        console.log('[AuthContext] 📢 Broadcasting LOGOUT to other tabs');
        broadcastChannelRef.current.postMessage({
          type: 'LOGOUT'
        });
      } else {
        console.log('[AuthContext] ℹ️ BroadcastChannel not available, relying on storage events');
      }
      
      console.log('[AuthContext] ✨ Logout complete');
    }
  };

  const updateProfile = async (data) => {
    try {
      console.log('[AuthContext] 📝 Profile update initiated');
      const res = await api.patch('/auth/updateMe', data);
      const updatedUser = res.data.data.user;
      
      console.log('[AuthContext] ✅ Profile updated:', updatedUser.name);
      
      // Update local state
      setUser(updatedUser);
      
      // Store in localStorage (this will trigger storage events in other tabs)
      console.log('[AuthContext] 💾 Saving updated profile to localStorage');
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Broadcast profile update to all other OPEN tabs (for instant notification)
      if (broadcastChannelRef.current) {
        console.log('[AuthContext] 📢 Broadcasting UPDATE_PROFILE to other tabs');
        broadcastChannelRef.current.postMessage({
          type: 'UPDATE_PROFILE',
          user: updatedUser
        });
      } else {
        console.log('[AuthContext] ℹ️ BroadcastChannel not available, relying on storage events');
      }
      
      console.log('[AuthContext] ✨ Profile update complete');
      return updatedUser;
    } catch (error) {
      console.error('[AuthContext] ❌ Profile update error:', error);
      throw error;
    }
  };

  const handleUpgrade = async () => {
    try {
      // 1. Create order
      const orderRes = await api.post('/payment/create-order');
      const order = orderRes.data.data.order;

      // 2. Open Razorpay Modal
      const options = {
        key: 'rzp_test_p4c7S7N77moVrd', // Could be from env in production
        amount: order.amount,
        currency: order.currency,
        name: 'SmartPost AI',
        description: 'Upgrade to Pro',
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify payment
            const verifyRes = await api.post('/payment/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            const updatedUser = verifyRes.data.data.user;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage({
                type: 'UPDATE_PROFILE',
                user: updatedUser
              });
            }
            
            toast.success('Successfully upgraded to Pro!');
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.');
            console.error(err);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: {
          color: '#10b981'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      toast.error('Failed to initiate payment.');
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, updateProfile, loading, handleUpgrade }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
