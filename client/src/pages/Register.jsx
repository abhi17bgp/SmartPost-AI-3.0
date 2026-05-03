import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, ArrowRight, Bot } from 'lucide-react';

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
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(var(--primary),0.15)] group"
          >
            {/* Animated glowing border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            
            <div className="flex justify-center mb-4 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="w-16 h-16 bg-gradient-to-br from-[#121214] to-card border border-primary/30 rounded-2xl flex items-center justify-center relative z-10 shadow-xl">
                  <Mail className="w-8 h-8 text-primary" />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="absolute -bottom-2 -right-2 bg-background rounded-full"
                  >
                    <CheckCircle className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
                  </motion.div>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-3 text-foreground tracking-tight">Verify Your Identity</h3>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-5 border border-border/50 text-left">
                <div className="flex gap-3">
                  <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium mb-1">
                      {successMsg}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Click the secure link in the email to activate your workspace and complete setup.
                    </p>
                  </div>
                </div>
              </div>

              <Link to="/login" className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]">
                Proceed to Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
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
