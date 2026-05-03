import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      const res = await toast.promise(
        register({ name, email, password, passwordConfirm: confirmPassword }),
        {
          loading: 'Creating account...',
          success: (res) => res.data?.isStudent ? '🎉 Student Account Created! Pro Unlocked!' : 'Registration successful!',
          error: (err) => err.response?.data?.message || 'Registration failed. Please try again.'
        }
      );
      
      if (res.data?.isStudent) {
        toast.success('1-Year Pro Subscription automatically applied to your student account!', { duration: 5000, icon: '🎓' });
        setSuccessMsg('🎓 Student Account Created! 1-Year Pro Subscription unlocked. Check your student email to verify your account and activate Pro features.');
      } else {
        setSuccessMsg(res.data.message || 'Registration Successful! Check your email to verify your account.');
      }
      
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // We do not immediately redirect, wait for user to verify email
    } catch (err) {
      // Handled by toast.promise
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-transparent relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <div className="absolute top-8 left-8 z-20">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Home
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card/40 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-border/50 mx-4 z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Create Account</h1>
          <p className="text-muted-foreground">Join SmartPost <span className="text-primary font-medium">AI</span> to start testing.</p>
        </div>

        {successMsg && (
          <div className="bg-primary/10 border border-primary/50 text-primary p-6 rounded-lg mb-6 text-center shadow-inner">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <p className="font-semibold text-lg mb-2 text-primary">{successMsg}</p>
            <p className="text-sm text-primary/80 mb-6">You must click the secure link in your email before you can sign in to your new workspace.</p>
            <Link to="/login" className="inline-block bg-primary hover:bg-primary/80 text-primary-foreground font-medium py-2 px-8 rounded-lg transition-colors shadow-md shadow-primary/20">
              Go to Login
            </Link>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-foreground text-sm font-medium mb-1.5">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" 
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-foreground text-sm font-medium mb-1.5">Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" 
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-foreground text-sm font-medium mb-1.5">Password</label>
              <input 
                type="password" 
                required
                minLength="8"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" 
                placeholder="•••••••• (Min 8 characters)"
              />
            </div>
            <div>
              <label className="block text-foreground text-sm font-medium mb-1.5">Confirm Password</label>
              <input 
                type="password" 
                required
                minLength="8"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-border text-foreground px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" 
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-lg transition-colors flex justify-center mt-4 disabled:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shadow-md shadow-primary/20"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        {!successMsg && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:text-primary/80 ml-1 transition-colors">Sign in</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Register;
