import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Zap, Shield, ChevronRight, Activity, Workflow, CheckCircle, MousePointer2, Users, Search, Play, ChevronUp, Menu, X, Lock, Layers, Layout } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const floatAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

const pulseGlow = {
  scale: [1, 1.05, 1],
  opacity: [0.5, 0.8, 0.5],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('[Home] User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  useEffect(() => {
    // Workflow Step Loop
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);

    // Scroll listener for Top Button
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-transparent overflow-hidden font-sans relative">
      {/* Animated Background Orbs */}
      <motion.div
        animate={{ ...pulseGlow, x: [0, 20, 0], y: [0, -20, 0] }}
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"
      />
      <motion.div
        animate={{ ...pulseGlow, x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -z-10 mix-blend-screen pointer-events-none"
      />

      {/* Premium Floating Navbar */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-6 left-0 right-0 z-50 px-4 sm:px-6 flex justify-center pointer-events-none"
      >
        <div className="w-full max-w-5xl bg-background/50 backdrop-blur-2xl border border-border rounded-full h-16 flex items-center justify-between px-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto transition-all hover:bg-background/70 hover:border-primary/30 text-foreground">
          {/* Logo Left */}
          <Link to="/" className="flex items-center gap-2 group w-1/4 min-w-max">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-110 transition-all overflow-hidden">

              <img
                src="/logo.png"
                alt="SmartPost AI Logo"
                className="w-full h-full object-contain"
              />

            </div>

            <span className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground tracking-tight hidden sm:block">
              SmartPost AI
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center justify-center gap-1 flex-1 relative bg-muted/20 p-1 rounded-full border border-border">
            {[
              { name: 'Features', id: 'features' },
              { name: 'Workflow', id: 'workflow' },
              { name: 'Pricing', id: 'pricing' }
            ].map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => scrollToSection(e, link.id)}
                className="px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-all duration-300 ease-out"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right Buttons */}
          <div className="hidden md:flex items-center justify-end gap-2 w-1/4 min-w-max">
            <ThemeToggle />
            <Link to="/login" className="px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-accent ml-2">
              Login
            </Link>
            <Link to="/register" className="relative group text-sm font-bold px-7 py-2 rounded-full bg-primary text-primary-foreground transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] hover:scale-105 overflow-hidden flex items-center gap-2">
              <span className="relative z-10">Get Started</span>
              <ChevronRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center justify-end gap-3 min-w-max">
            <ThemeToggle />
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-[80px] left-4 right-4 bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl flex flex-col gap-4 z-50 pointer-events-auto"
            >
              {[
                { name: 'Features', id: 'features' },
                { name: 'Workflow', id: 'workflow' },
                { name: 'Pricing', id: 'pricing' }
              ].map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    scrollToSection(e, link.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-3 text-base font-semibold text-foreground rounded-xl hover:bg-accent transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-border w-full my-2"></div>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="w-full text-center py-3 font-semibold text-foreground rounded-xl border border-border hover:bg-accent transition-colors">
                  Login
                </Link>
                <Link to="/register" className="w-full text-center py-3 font-semibold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                  Sign Up
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl relative">


          {/* Animated Typing Header */}
          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 min-h-[240px] sm:min-h-[180px] md:min-h-[160px] flex flex-col justify-center">
            The next generation of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 block mt-2 pb-4 min-h-[120px] sm:min-h-[90px] md:min-h-0 flex-shrink-0">
              <TypeAnimation
                sequence={[
                  'Intelligent API Testing',
                  2500,
                  'Automated Debugging',
                  2500,
                  'AI-Powered Generation',
                  2500,
                  'Secure Cloud Routing',
                  2500
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Automate, analyze, and optimize your API endpoints seamlessly. Connect workspaces, run requests, and let our AI provide deep insights into your responses.
          </motion.p>
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
            <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 group hover:shadow-primary/40">
              Start Building Free <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#workflow" onClick={(e) => scrollToSection(e, 'workflow')} className="flex items-center justify-center px-8 py-4 rounded-xl font-semibold bg-background border border-border text-foreground hover:bg-accent transition-all backdrop-blur-md">
              See How It Works
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">Enterprise Grade Capabilities</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">Everything you need to debug, track, and optimize your endpoints, packed into a highly polished, professional interface.</p>
        </div>

        {/* Bento Grid Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          
          {/* Card 1: API Engine (Spans 2 columns) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-[300px] h-[200px] border border-border/20 rounded-2xl bg-[#121214] shadow-2xl rotate-[-5deg] group-hover:rotate-[-2deg] transition-transform duration-500 overflow-hidden flex flex-col">
              <div className="h-8 border-b border-border/20 flex items-center px-3 gap-2 bg-[#0c0c0e]">
                <div className="w-2 h-2 rounded-full bg-rose-500/80" /><div className="w-2 h-2 rounded-full bg-amber-500/80" /><div className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <div className="p-4 space-y-2">
                 <div className="h-3 w-1/2 bg-amber-500/20 rounded-full" />
                 <div className="h-3 w-3/4 bg-border/20 rounded-full" />
                 <div className="h-3 w-5/6 bg-border/20 rounded-full" />
                 <div className="h-3 w-1/3 bg-amber-500/30 rounded-full mt-4" />
              </div>
            </div>
            
            <div className="relative z-10 max-w-[60%]">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
                <Zap className="text-amber-500" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Lightning Fast Engine</h3>
              <p className="text-muted-foreground leading-relaxed">Execute complex API workflows instantly with minimal latency. Built on a high-performance proxy architecture that completely eliminates CORS barriers.</p>
            </div>
          </motion.div>

          {/* Card 2: AI Analysis (1 column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="relative group overflow-hidden rounded-3xl bg-gradient-to-b from-[#101014] to-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Bot className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Smart AI Analysis</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Automatically analyzes your JSON responses for security flaws, performance bottlenecks, and REST best practices.</p>
            </div>
          </motion.div>

          {/* Card 3: Performance (1 column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="relative group overflow-hidden rounded-3xl bg-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="absolute right-0 bottom-0 w-32 h-32 flex items-end justify-end p-6 gap-2 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="w-3 h-12 bg-rose-500/80 rounded-t-sm" />
              <div className="w-3 h-16 bg-amber-500/80 rounded-t-sm" />
              <div className="w-3 h-24 bg-primary/80 rounded-t-sm" />
              <div className="w-3 h-8 bg-blue-500/80 rounded-t-sm" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                <Activity className="text-rose-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Performance Metrics</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Detailed waterfall charts dissecting DNS, TCP, and TLS handshake times for extreme precision optimization.</p>
            </div>
          </motion.div>

          {/* Card 4: Collaboration (Spans 2 columns) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex -space-x-4 pointer-events-none">
               <div className="w-16 h-16 rounded-full border-4 border-[#0c0c0e] bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-xl z-30 transform group-hover:-translate-y-2 transition-transform">AS</div>
               <div className="w-16 h-16 rounded-full border-4 border-[#0c0c0e] bg-rose-500 flex items-center justify-center text-white font-bold text-xl shadow-xl z-20 transform group-hover:translate-y-2 transition-transform duration-500">SA</div>
               <div className="w-16 h-16 rounded-full border-4 border-[#0c0c0e] bg-emerald-500 flex items-center justify-center text-white font-bold text-xl shadow-xl z-10 transform group-hover:-translate-y-1 transition-transform duration-700">CH</div>
            </div>
            <div className="relative z-10 max-w-[55%]">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                <Users className="text-indigo-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Real-Time Workspaces</h3>
              <p className="text-muted-foreground leading-relaxed">Invite your entire engineering team. Share endpoints, environments, and response history securely in real-time without ever sending a `.env` file via Slack.</p>
            </div>
          </motion.div>

          {/* Card 5: Collections (1 column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="relative group overflow-hidden rounded-3xl bg-gradient-to-tr from-[#101014] to-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Layers className="text-emerald-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Organized Collections</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Save, structure, and document your endpoints securely in the cloud with instant device synchronization.</p>
            </div>
          </motion.div>

          {/* Card 6: Multi-Tab (Spans 2 columns) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
            className="md:col-span-2 relative group overflow-hidden rounded-3xl bg-[#0c0c0e] border border-border/40 hover:border-primary/40 transition-all p-8 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="absolute top-10 right-10 flex gap-2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="w-32 h-10 bg-[#121214] border border-border/40 rounded-t-lg flex items-center px-4 transform translate-y-2 z-10">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"/>
                <div className="w-12 h-1.5 bg-border/40 rounded-full"/>
              </div>
              <div className="w-32 h-10 bg-[#1a1a1d] border-t border-x border-primary/30 rounded-t-lg flex items-center px-4 z-20 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"/>
                <div className="w-12 h-1.5 bg-primary/40 rounded-full"/>
              </div>
              <div className="w-32 h-10 bg-[#121214] border border-border/40 rounded-t-lg flex items-center px-4 transform translate-y-2 z-10">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"/>
                <div className="w-12 h-1.5 bg-border/40 rounded-full"/>
              </div>
            </div>
            
            <div className="relative z-10 max-w-[60%]">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <Layout className="text-blue-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Multi-Tab Interface</h3>
              <p className="text-muted-foreground leading-relaxed">Experience a true desktop-class application in the browser. State is preserved across multiple tabs, letting you compare responses and workflows side-by-side without losing data.</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Dynamic Workflow Section using Option 2 Liquid Mesh Background */}
      <section id="workflow" className="py-32 relative overflow-hidden">
        {/* The beautiful Liquid Flow Background behind just this section */}
        <motion.div
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 15, ease: "linear", repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-background bg-[length:200%_200%] opacity-80 -z-10"
        />
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[80px] border-y border-primary/20 -z-10 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left Side: Step Tracker */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-6">Seamless Execution</h2>
              <p className="text-muted-foreground mb-10 text-lg">Watch how SmartPost AI autonomously processes your data from start to finish with unmatched clarity.</p>
              <div className="space-y-6">
                {[
                  { icon: <Search />, title: "1. Provide API to Test", desc: "Simply enter your endpoint URL and parameters." },
                  { icon: <Activity />, title: "2. Analyze Performance", desc: "Our engine executes and monitors latency, size, and status." },
                  { icon: <Bot />, title: "3. AI Deep Analysis", desc: "AI automatically spots vulnerabilities and formatting errors." },
                  { icon: <Users />, title: "4. Collaborative Workspace", desc: "Instantly share results with your team in real-time." }
                ].map((step, i) => (
                  <div key={i} className={`flex gap-4 p-4 rounded-2xl transition-all duration-500 ${activeStep === i ? 'bg-background/40 border border-border shadow-lg' : 'opacity-40 grayscale'}`}>
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${activeStep === i ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'}`}>
                        {step.icon}
                      </div>
                    </div>
                    <div className="pt-1">
                      <h4 className={`text-xl font-medium transition-colors duration-500 ${activeStep === i ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</h4>
                      <p className="text-muted-foreground/80 mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Side: The Authentic SaaS Application Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex-1 w-full"
            >
              <div className="rounded-2xl bg-[#0c0c0e] border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden h-[450px] flex flex-col font-sans ring-1 ring-white/5">
                {/* Authentic macOS-style Window Header */}
                <div className="h-12 bg-[#121214] border-b border-border/40 flex items-center px-4 justify-between select-none">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <div className="flex bg-[#1a1a1d] rounded-md px-3 py-1 items-center justify-center gap-2 border border-border/30 shadow-inner">
                    <Lock size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">api.smartpost.com/workspace</span>
                  </div>
                  <div className="w-16 flex justify-end gap-2 text-muted-foreground">
                    <Menu size={14} />
                  </div>
                </div>

                {/* Application Body */}
                <div className="flex-1 relative flex">
                  {/* Minimal Sidebar */}
                  <div className="w-14 border-r border-border/40 bg-[#121214] flex flex-col items-center py-4 gap-6 text-muted-foreground/50">
                    <Search size={18} className="hover:text-primary transition-colors cursor-pointer" />
                    <Activity size={18} className="text-primary cursor-pointer" />
                    <Workflow size={18} className="hover:text-primary transition-colors cursor-pointer" />
                    <Bot size={18} className="hover:text-primary transition-colors cursor-pointer" />
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 relative bg-[#0c0c0e] overflow-hidden">
                    <AnimatePresence mode="wait">
                      {/* STEP 0: Request Builder */}
                      {activeStep === 0 && (
                        <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-5">
                          <div className="flex gap-3 mb-6">
                            <div className="w-20 h-10 bg-emerald-500/10 text-emerald-500 font-semibold text-sm flex items-center justify-center rounded-md border border-emerald-500/20">GET</div>
                            <div className="flex-1 h-10 bg-[#1a1a1d] rounded-md flex items-center px-3 font-mono text-sm text-foreground/90 border border-border/30 shadow-inner">
                              <span className="text-muted-foreground/60 mr-1">https://</span>
                              api.example.com/v1/users
                              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-4 bg-primary ml-1" />
                            </div>
                            <div className="h-10 px-6 bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center rounded-md shadow-lg shadow-primary/20">
                              Send
                            </div>
                          </div>
                          <div className="flex text-xs text-muted-foreground border-b border-border/40 mb-4 select-none">
                            <div className="px-4 py-2 border-b-2 border-primary text-foreground">Headers (3)</div>
                            <div className="px-4 py-2">Params</div>
                            <div className="px-4 py-2">Auth</div>
                            <div className="px-4 py-2">Body</div>
                          </div>
                          <div className="space-y-3 font-mono text-xs">
                            <div className="flex border-b border-border/10 pb-2 hover:bg-white/5 px-2 rounded transition-colors">
                              <div className="w-1/3 text-emerald-400">Authorization</div>
                              <div className="flex-1 text-muted-foreground truncate">Bearer token_xyz...</div>
                            </div>
                            <div className="flex border-b border-border/10 pb-2 hover:bg-white/5 px-2 rounded transition-colors">
                              <div className="w-1/3 text-emerald-400">Content-Type</div>
                              <div className="flex-1 text-muted-foreground">application/json</div>
                            </div>
                            <div className="flex pb-2 hover:bg-white/5 px-2 rounded transition-colors">
                              <div className="w-1/3 text-emerald-400">Accept</div>
                              <div className="flex-1 text-muted-foreground">*/*</div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 1: Performance */}
                      {activeStep === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col p-5">
                          <div className="flex items-center gap-8 mb-6 pb-5 border-b border-border/40">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</div>
                              <div className="flex items-center gap-2 text-emerald-500 font-mono text-xl">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" /> 200 OK
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Time</div>
                              <div className="text-foreground font-mono text-xl">45 <span className="text-sm text-muted-foreground">ms</span></div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Size</div>
                              <div className="text-foreground font-mono text-xl">2.4 <span className="text-sm text-muted-foreground">KB</span></div>
                            </div>
                          </div>
                          <div className="flex-1 relative">
                            <div className="text-xs text-muted-foreground mb-4 font-semibold uppercase tracking-wider">Request Timeline</div>
                            <div className="space-y-4">
                              {[
                                { label: 'DNS Lookup', width: '15%', color: 'bg-indigo-500', time: '12ms' },
                                { label: 'TCP Connection', width: '25%', color: 'bg-blue-500', time: '22ms' },
                                { label: 'TLS Handshake', width: '40%', color: 'bg-purple-500', time: '35ms' },
                                { label: 'First Byte', width: '80%', color: 'bg-emerald-500', time: '42ms' },
                                { label: 'Download', width: '100%', color: 'bg-primary', time: '45ms' }
                              ].map((bar, i) => (
                                <div key={i} className="flex items-center text-xs">
                                  <div className="w-28 text-muted-foreground font-medium">{bar.label}</div>
                                  <div className="flex-1 h-1.5 bg-[#1a1a1d] rounded-full overflow-hidden flex border border-border/10">
                                    <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: bar.width }} 
                                      transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }} 
                                      className={`h-full ${bar.color} shadow-[0_0_10px_currentColor]`} 
                                    />
                                  </div>
                                  <div className="w-12 text-right text-muted-foreground font-mono">{bar.time}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 2: AI Analysis */}
                      {activeStep === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col md:flex-row">
                          <div className="flex-1 p-5 border-r border-border/40 font-mono text-[11px] sm:text-xs overflow-hidden relative">
                            <div className="text-muted-foreground mb-3 font-sans font-medium text-xs border-b border-border/20 pb-2">response.json</div>
                            <div className="text-[#e5e5e5] leading-relaxed">
                              <div><span className="text-yellow-300">{`{`}</span></div>
                              <div className="pl-4"><span className="text-emerald-400">"status"</span>: <span className="text-blue-400">"success"</span>,</div>
                              <div className="pl-4"><span className="text-emerald-400">"data"</span>: <span className="text-purple-400">{`[`}</span></div>
                              <div className="pl-8"><span className="text-pink-400">{`{`}</span></div>
                              <motion.div 
                                animate={{ backgroundColor: ["rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0)"] }} 
                                transition={{ duration: 2, repeat: Infinity }}
                                className="pl-12 py-0.5 -ml-1 px-1 rounded border border-transparent"
                                style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              >
                                <span className="text-emerald-400">"email"</span>: <span className="text-blue-400">"admin@example.com"</span>
                              </motion.div>
                              <div className="pl-12"><span className="text-emerald-400">"role"</span>: <span className="text-blue-400">"superuser"</span></div>
                              <div className="pl-8"><span className="text-pink-400">{`}`}</span></div>
                              <div className="pl-4"><span className="text-purple-400">{`]`}</span></div>
                              <div><span className="text-yellow-300">{`}`}</span></div>
                            </div>
                          </div>
                          <div className="w-1/2 bg-[#101012] p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-primary border-b border-border/20 pb-2">
                              <Bot size={16} />
                              <span className="font-semibold text-sm">Smart Analysis</span>
                            </div>
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                              className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs relative overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                              <div className="text-red-400 font-bold mb-1 ml-1">Security Warning</div>
                              <div className="text-muted-foreground ml-1">Sensitive data (email) exposed in unprotected endpoint. Consider masking.</div>
                            </motion.div>
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
                              className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs relative overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                              <div className="text-emerald-400 font-bold mb-1 ml-1">Best Practice</div>
                              <div className="text-muted-foreground ml-1">Response time is excellent. Consider paginating 'data' array for scale.</div>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 3: Collaboration */}
                      {activeStep === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-5 relative font-mono text-[11px] sm:text-xs">
                          <div className="flex justify-between items-center mb-5 border-b border-border/40 pb-3 font-sans">
                            <div className="text-muted-foreground font-medium text-xs flex items-center gap-2">
                              <Users size={14} /> collection / auth.json
                            </div>
                            <div className="flex -space-x-2">
                              <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0c0c0e] z-20 shadow-md">AS</div>
                              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0c0c0e] z-10 shadow-md">SA</div>
                            </div>
                          </div>

                          <div className="text-[#e5e5e5] space-y-1.5 leading-relaxed bg-[#121214] p-4 rounded-lg border border-border/20 shadow-inner">
                            <div><span className="text-yellow-300">{`{`}</span></div>
                            <div className="pl-4"><span className="text-emerald-400">"name"</span>: <span className="text-blue-400">"Login Request"</span>,</div>
                            <div className="pl-4"><span className="text-emerald-400">"method"</span>: <span className="text-blue-400">"POST"</span>,</div>
                            <div className="pl-4"><span className="text-emerald-400">"body"</span>: <span className="text-purple-400">{`{`}</span></div>
                            
                            <div className="pl-8 relative inline-block group mt-1">
                              <span className="text-emerald-400">"username"</span>: <span className="text-blue-400">{'"{{username}}"'}</span>
                              {/* Cursor 1 */}
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [1, 0, 1] }} 
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="absolute -right-[1px] top-[2px] bottom-[2px] w-[2px] bg-rose-500 shadow-[0_0_5px_#f43f5e]"
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                                className="absolute -top-6 -right-6 bg-rose-500 text-white font-sans text-[10px] px-2 py-0.5 rounded shadow-lg z-10 font-medium tracking-wide"
                              >
                                Ashish
                              </motion.div>
                            </div>
                            <br/>
                            
                            <div className="pl-8 relative inline-block mt-2">
                              <span className="text-emerald-400">"password"</span>: <span className="text-blue-400">{'"{{password}}"'}</span>
                              {/* Cursor 2 */}
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [1, 0, 1] }} 
                                transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                                className="absolute -right-[1px] top-[2px] bottom-[2px] w-[2px] bg-indigo-500 shadow-[0_0_5px_#6366f1]"
                              />
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                                className="absolute -bottom-6 -right-5 bg-indigo-500 text-white font-sans text-[10px] px-2 py-0.5 rounded shadow-lg z-10 font-medium tracking-wide"
                              >
                                Saurabh
                              </motion.div>
                            </div>
                            
                            <div className="pl-4 mt-1"><span className="text-purple-400">{`}`}</span></div>
                            <div><span className="text-yellow-300">{`}`}</span></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">Start instantly for free. No credit card required. Upgrade when you need team power.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Developer Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-3xl bg-[#0c0c0e] border border-border/40 hover:border-border/80 transition-all flex flex-col relative overflow-hidden"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Developer</h3>
              <p className="text-muted-foreground text-sm">Perfect for individual developers.</p>
            </div>
            <div className="text-5xl font-extrabold text-foreground mb-10 tracking-tight">₹0 <span className="text-lg font-medium text-muted-foreground tracking-normal">/ forever</span></div>
            <ul className="space-y-5 mb-10 flex-1">
              {['4 Free API Performance Tests', 'Basic API Requests', 'Local History', 'Standard Network Proxy'].map((item, i) => (
                <li key={i} className="flex gap-4 items-center text-foreground/80 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-emerald-500" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block w-full text-center py-4 rounded-xl font-bold bg-[#121214] border border-border/50 text-foreground hover:bg-[#1a1a1d] hover:border-border transition-all">
              Get Started Free
            </Link>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-10 rounded-3xl bg-[#0c0c0e] border border-primary/50 relative overflow-hidden flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)] transform md:-translate-y-4"
          >
            {/* Absolute Glow Background */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-primary/20 to-transparent blur-3xl pointer-events-none" />
            
            {/* Badge */}
            <div className="absolute top-0 right-8 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-b-lg shadow-lg">
              MOST POPULAR
            </div>

            <div className="mb-8 relative z-10">
              <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">Pro</h3>
              <p className="text-primary/80 text-sm font-medium">For teams requiring deep analysis.</p>
            </div>
            <div className="text-5xl font-extrabold text-foreground mb-10 tracking-tight relative z-10">₹100 <span className="text-lg font-medium text-muted-foreground tracking-normal">/ year</span></div>
            <ul className="space-y-5 mb-10 flex-1 relative z-10">
              {['Unlimited Performance Analyzer', 'Team Collaboration Workspaces', 'Create Multiple Workspaces', 'Priority Technical Support'].map((item, i) => (
                <li key={i} className="flex gap-4 items-center text-foreground font-medium">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block w-full text-center py-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] relative z-10">
              Get Started Pro
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-background/50 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-primary" />
            <span className="text-lg font-bold text-foreground tracking-wide">SmartPost AI</span>
          </div>
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} SmartPost API Tool. All rights reserved.</p>
          <div className="flex gap-4 text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors text-sm">Privacy</Link>
            <Link to="/" className="hover:text-primary transition-colors text-sm">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors text-sm">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Scroll To Top Button */}
      <AnimatePresence>
        {showTopBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-[100] w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md border border-primary/50 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] focus:outline-none"
            aria-label="Scroll to top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
