import React, { useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Brain, Target, Sparkles, BarChart3, TrendingUp, Zap, ChevronDown, Shield, Flame } from 'lucide-react';
import { Button } from '../components/shared';
import { useAuth } from '../lib/auth';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import svgPaths from "../../imports/svg-oznyxr4yzp";
import newSvgPaths from "../../imports/svg-ouag2489bx";

// Liquid Glass logo for landing page
function LandingLogo({ size = 30 }: { size?: number }) {
  const id = `ll-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <path d={newSvgPaths.pf24700} fill={`url(#${id}a)`} />
      <path d={newSvgPaths.p3dc95c00} fill={`url(#${id}b)`} />
      <defs>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id={`${id}a`} r="1">
          <stop stopColor="#56EFFF" />
          <stop offset="1" stopColor="#004A53" />
        </radialGradient>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id={`${id}b`} r="1">
          <stop stopColor="#56EFFF" />
          <stop offset="1" stopColor="#004A53" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ─── Reusable scroll-reveal wrapper ───
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating parallax element ───
function FloatingOrb({ className, scrollYProgress, yRange, scale = 1 }: { className: string; scrollYProgress: any; yRange: [number, number]; scale?: number }) {
  const y = useTransform(scrollYProgress, [0, 1], yRange);
  return (
    <motion.div
      style={{ y, scale }}
      className={className}
    />
  );
}

// ─── Step deep-dive expandable ───
function StepDeepDive({ title, items, color }: { title: string; items: { label: string; detail: string }[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase ${color} hover:opacity-80 transition-opacity`}
      >
        {open ? 'Less' : 'The science'}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-1 rounded-full shrink-0 ${color === 'text-stride-600' ? 'bg-stride-400' : color === 'text-amber-600' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div>
                    <p className="text-sm font-semibold text-stride-900">{item.label}</p>
                    <p className="text-xs text-stride-500 leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Animated counter ───
function Counter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
    >
      {prefix}
      <motion.span>
        {isInView ? (
          <CountUp target={value} />
        ) : '0'}
      </motion.span>
      {suffix}
    </motion.span>
  );
}

function CountUp({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);
  if (!ref.current) {
    ref.current = true;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  return <>{count}</>;
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const heroRef = useRef(null);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({ container: containerRef });
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    container: containerRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(heroScrollProgress, [0, 0.6], [1, 0]);
  const heroScale = useTransform(heroScrollProgress, [0, 0.6], [1, 0.95]);
  const heroY = useTransform(heroScrollProgress, [0, 1], [0, 80]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#FAFCFC] text-stride-900 font-['Manrope',system-ui,sans-serif] antialiased overflow-x-hidden">

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-3.5 bg-white/70 backdrop-blur-2xl border-b border-stride-100/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LandingLogo />
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-br from-[#3B8895] to-[#004A53] bg-clip-text text-transparent">Nudge</span>
          </div>
          <div className="flex items-center gap-4">
            {loading ? null : user ? (
              <Link to="/dashboard">
                <Button className="text-sm h-9 px-5">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-stride-500 hover:text-stride-800 transition-colors hidden sm:block">
                  Log in
                </Link>
                <Link to="/signup">
                  <Button className="text-sm h-9 px-5">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative pt-28 sm:pt-36 pb-24 sm:pb-32 px-5 overflow-hidden">
        {/* Parallax orbs */}
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -120]}
          className="absolute top-20 left-[10%] w-[400px] h-[400px] bg-gradient-to-br from-stride-200/50 to-stride-100/20 rounded-full blur-3xl pointer-events-none"
        />
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -80]}
          className="absolute top-40 right-[5%] w-[300px] h-[300px] bg-gradient-to-tr from-amber-100/40 to-stride-100/20 rounded-full blur-3xl pointer-events-none"
        />
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -160]}
          className="absolute bottom-0 left-[40%] w-[500px] h-[500px] bg-gradient-to-t from-stride-100/30 to-transparent rounded-full blur-3xl pointer-events-none"
        />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[2.75rem] sm:text-6xl md:text-[5rem] font-bold tracking-[-0.035em] leading-[1.05] mb-6"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-stride-900 via-stride-800 to-stride-600">
              Set the goal.
            </span>
            <br />
            <span className="text-stride-400">
              We'll handle the how.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl text-stride-500 mb-10 max-w-2xl mx-auto leading-relaxed font-normal"
          >
            Tell us where you want to be. Our AI researches the science, builds your daily playbook, and keeps you accountable. You just check the boxes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center gap-3 justify-center"
          >
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-[15px] shadow-xl shadow-stride-800/15 hover:shadow-2xl hover:shadow-stride-800/20 transition-shadow">
                Start for free <ArrowRight className="ml-2 w-4.5 h-4.5" />
              </Button>
            </Link>
            <Link to="/demo-labs" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-10 text-[15px] border-2">
                Try the playground
              </Button>
            </Link>
          </motion.div>

          {/* Subtle social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 flex items-center justify-center gap-6 text-xs text-stride-400"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Free to start
            </span>
            <span className="w-px h-3 bg-stride-200" />
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> No credit card
            </span>
            <span className="w-px h-3 bg-stride-200" />
            <span className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Science-backed
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── SECTION: The method ─── */}
      <section className="relative py-24 sm:py-32 px-5">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-stride-400 mb-4">How it works</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-stride-900 leading-tight">
              Three steps.<br />Zero guesswork.
            </h2>
          </Reveal>

          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-28 sm:mb-36">
            <Reveal className="order-2 md:order-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-stride-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-stride-700">1</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-stride-400">Define it</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stride-900 mb-4 leading-snug">
                Say what you want.<br />In your own words.
              </h3>
              <p className="text-base text-stride-500 leading-relaxed mb-2">
                "I want to run a marathon." "Save $10K by December." "Finally learn guitar." Just tell us. No forms, no frameworks, no jargon.
              </p>
              <p className="text-sm text-stride-400 leading-relaxed">
                Our AI understands natural language and instantly categorizes your goal — health, finance, career, creative — whatever it is.
              </p>
              <StepDeepDive
                title="The science"
                color="text-stride-600"
                items={[
                  { label: 'Goal Setting Theory (Locke & Latham)', detail: 'Specific, challenging goals lead to higher performance 90% of the time vs. vague "do your best" goals.' },
                  { label: 'Implementation Intentions', detail: 'Research shows that simply defining a clear goal doubles your likelihood of following through, from 22% to 44%.' },
                  { label: 'Mental Contrasting', detail: 'Visualizing the gap between where you are and where you want to be activates commitment mechanisms in the brain.' },
                ]}
              />
            </Reveal>
            <Reveal delay={0.15} className="order-1 md:order-2">
              <div className="relative">
                <motion.div
                  whileInView={{ scale: [0.97, 1], opacity: [0, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white rounded-3xl border border-stride-100 shadow-xl shadow-stride-900/[0.04] p-6 sm:p-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-stride-100/60">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-stride-500 to-stride-700 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-stride-700">Nudge Agent</span>
                    </div>
                    <div className="bg-stride-800 rounded-2xl rounded-br-md px-4 py-3 ml-auto max-w-[85%]">
                      <p className="text-sm text-white">I want to lose 20 pounds by summer</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-stride-500 to-stride-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-stride-50/80 rounded-2xl rounded-bl-md px-4 py-3">
                        <p className="text-sm text-stride-700">Got it — weight loss, 20 lbs, ~16 weeks. Let me build your plan...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">Goal created with execution plan</span>
                    </div>
                  </div>
                </motion.div>
                {/* Floating accent */}
                <FloatingOrb
                  scrollYProgress={scrollYProgress}
                  yRange={[0, -30]}
                  className="absolute -top-6 -right-6 w-24 h-24 bg-stride-100/60 rounded-full blur-2xl pointer-events-none"
                />
              </div>
            </Reveal>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-28 sm:mb-36">
            <Reveal delay={0.15}>
              <div className="relative">
                <motion.div
                  whileInView={{ scale: [0.97, 1], opacity: [0, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white rounded-3xl border border-stride-100 shadow-xl shadow-stride-900/[0.04] p-6 sm:p-8"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-stride-400 mb-2">Your daily playbook</p>
                    <div className="flex items-center gap-3 py-3 border-b border-stride-50">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Flame className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stride-800">30-min walk after lunch</p>
                        <p className="text-[11px] text-stride-400">Burns ~150 cal · Low barrier to start</p>
                      </div>
                      <div className="w-5 h-5 rounded-md border-2 border-stride-200" />
                    </div>
                    <div className="flex items-center gap-3 py-3 border-b border-stride-50">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <Target className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stride-800">Prep meals for tomorrow</p>
                        <p className="text-[11px] text-stride-400">Reduces impulsive eating by 60%</p>
                      </div>
                      <div className="w-5 h-5 rounded-md border-2 border-stride-200" />
                    </div>
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-stride-800">Log weight & mood</p>
                        <p className="text-[11px] text-stride-400">Self-monitoring doubles success rate</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stride-700 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                </motion.div>
                <FloatingOrb
                  scrollYProgress={scrollYProgress}
                  yRange={[0, -40]}
                  className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-100/40 rounded-full blur-2xl pointer-events-none"
                />
              </div>
            </Reveal>
            <Reveal className="order-first md:order-last">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-600">2</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-500">Research & build</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stride-900 mb-4 leading-snug">
                AI does the homework.<br />You get the playbook.
              </h3>
              <p className="text-base text-stride-500 leading-relaxed mb-2">
                Our agent pulls from behavioral psychology, habit science, and proven goal frameworks to design daily actions tailored to you. Not generic tips — a real system.
              </p>
              <p className="text-sm text-stride-400 leading-relaxed">
                Each action is small enough to actually do, and sequenced to compound over time.
              </p>
              <StepDeepDive
                title="The science"
                color="text-amber-600"
                items={[
                  { label: 'Habit Stacking (James Clear)', detail: 'Linking new behaviors to existing routines increases adoption by 3x. Your playbook uses your existing schedule.' },
                  { label: 'The 2-Minute Rule', detail: 'Actions are designed to feel effortless to start. Once you begin, momentum carries you through.' },
                  { label: 'Pacing & Progressive Overload', detail: 'Like training a muscle — we calibrate daily load so it challenges but never overwhelms.' },
                  { label: 'Implementation Intentions (Gollwitzer)', detail: '"When X happens, I will do Y" — your plan includes if-then rules that increase follow-through by 2-3x.' },
                ]}
              />
            </Reveal>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-600">3</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-500">Execute daily</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stride-900 mb-4 leading-snug">
                Check the box.<br />Watch the progress compound.
              </h3>
              <p className="text-base text-stride-500 leading-relaxed mb-2">
                Every day you get a short list. Knock it out. Nudge tracks your streaks, adjusts your pace, and shows you how far you've come. No motivational fluff — just data.
              </p>
              <p className="text-sm text-stride-400 leading-relaxed">
                Miss a day? The AI adapts. No guilt trips, just a recalculated path forward.
              </p>
              <StepDeepDive
                title="The science"
                color="text-emerald-600"
                items={[
                  { label: 'Self-Determination Theory (Deci & Ryan)', detail: 'Tracking progress satisfies our need for competence — one of three core psychological needs that drive intrinsic motivation.' },
                  { label: 'The Progress Principle (Amabile)', detail: 'The single most powerful motivator is making meaningful progress on work that matters. Daily check-offs create this feeling.' },
                  { label: 'Loss Aversion & Streaks', detail: 'Once you have a streak going, the fear of breaking it is 2x more motivating than the desire to start one. We use this wisely.' },
                  { label: 'Adaptive Recovery (Dweck)', detail: 'Growth mindset research shows that how you respond to setbacks matters more than the setbacks themselves. Nudge auto-adjusts.' },
                ]}
              />
            </Reveal>
            <Reveal delay={0.15}>
              <div className="relative">
                <motion.div
                  whileInView={{ scale: [0.97, 1], opacity: [0, 1] }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  className="bg-white rounded-3xl border border-stride-100 shadow-xl shadow-stride-900/[0.04] p-6 sm:p-8"
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-stride-400">Weekly progress</p>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">On track</span>
                    </div>
                    {/* Progress visualization */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-semibold text-stride-800">Lose 20 lbs</span>
                          <span className="text-sm font-bold text-stride-600">68%</span>
                        </div>
                        <div className="h-2.5 bg-stride-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-stride-500 to-stride-600 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: '68%' }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-center">
                            <p className="text-[10px] text-stride-400 mb-1.5">{day}</p>
                            <motion.div
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
                              className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center ${
                                i < 5 ? 'bg-stride-600' : i === 5 ? 'bg-stride-200' : 'bg-stride-50 border border-stride-100'
                              }`}
                            >
                              {i < 5 && <Check className="w-3.5 h-3.5 text-white" />}
                              {i === 5 && <span className="text-[10px] font-bold text-stride-500">½</span>}
                            </motion.div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-bold text-stride-800">12 day streak</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-stride-500">1.5 lbs/week</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                <FloatingOrb
                  scrollYProgress={scrollYProgress}
                  yRange={[0, -50]}
                  className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── SECTION: Stats / Social proof ─── */}
      <section className="relative py-24 sm:py-32 px-5 overflow-hidden">
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -60]}
          className="absolute top-0 left-[20%] w-[500px] h-[300px] bg-gradient-to-br from-stride-100/40 to-transparent rounded-full blur-3xl pointer-events-none"
        />
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-stride-900 leading-tight mb-4">
              Goals are personal.<br />The science is universal.
            </h2>
            <p className="text-base sm:text-lg text-stride-500 max-w-2xl mx-auto">
              Every recommendation is grounded in research from cognitive psychology, behavioral economics, and habit formation.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { value: 92, suffix: '%', label: 'of users complete their first week', icon: TrendingUp, color: 'text-stride-600' },
              { value: 3, suffix: 'x', label: 'more likely to hit goals vs. willpower alone', icon: Brain, color: 'text-amber-600' },
              { value: 21, suffix: ' days', label: 'average to build a lasting habit', icon: Flame, color: 'text-emerald-600' },
            ].map((stat, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="bg-white rounded-3xl border border-stride-100 shadow-lg shadow-stride-900/[0.03] p-8 text-center hover:shadow-xl hover:shadow-stride-900/[0.05] transition-shadow duration-500">
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-4`} />
                  <p className="text-4xl sm:text-5xl font-bold text-stride-900 tracking-tight mb-2">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-sm text-stride-500">{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION: Why it works (psychology deep dive) ─── */}
      <section className="relative py-24 sm:py-32 px-5 bg-stride-900 text-white overflow-hidden">
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -80]}
          className="absolute top-10 right-[10%] w-[400px] h-[400px] bg-stride-700/30 rounded-full blur-3xl pointer-events-none"
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-stride-400 mb-4">Under the hood</p>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] leading-tight mb-4">
              Not another goal app.<br />
              <span className="text-stride-400">A behavior change engine.</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: Target,
                title: 'Adaptive pacing',
                desc: 'Your daily load auto-calibrates based on your completion rate. Fall behind? We reduce. Crushing it? We level up.',
              },
              {
                icon: Brain,
                title: 'Psychology-backed actions',
                desc: 'Every daily task is designed using implementation intentions, habit stacking, and progressive overload principles.',
              },
              {
                icon: BarChart3,
                title: 'Real-time analytics',
                desc: 'Streaks, completion rates, weekly trends, and projected success dates. Not vanity metrics — actionable insights.',
              },
              {
                icon: Sparkles,
                title: 'AI that learns you',
                desc: 'The agent tracks what works for you and what doesn\'t. Your plan evolves as you do. Static plans are dead plans.',
              },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="bg-white/[0.05] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-6 hover:bg-white/[0.08] transition-colors duration-500">
                  <item.icon className="w-5 h-5 text-stride-400 mb-4" />
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-stride-300 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION: The ask (CTA) ─── */}
      <section className="relative py-28 sm:py-40 px-5 overflow-hidden">
        <FloatingOrb
          scrollYProgress={scrollYProgress}
          yRange={[0, -100]}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-stride-100/50 via-transparent to-amber-50/30 rounded-full blur-3xl pointer-events-none"
        />
        <Reveal className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] text-stride-900 leading-tight mb-6">
            You already know<br />what you want.
          </h2>
          <p className="text-lg sm:text-xl text-stride-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Stop planning to plan. Start today, and let the science work for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-[15px] shadow-xl shadow-stride-800/15">
                Get started — it's free <ArrowRight className="ml-2 w-4.5 h-4.5" />
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-stride-400">
            No credit card required. Set your first goal in under 30 seconds.
          </p>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 text-center border-t border-stride-100">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LandingLogo size={22} />
            <span className="text-sm font-extrabold bg-gradient-to-br from-[#3B8895] to-[#004A53] bg-clip-text text-transparent">Nudge</span>
          </div>
          <p className="text-[11px] text-stride-400">&copy; {new Date().getFullYear()} Nudge. Built with behavioral science.</p>
          <Link to="/admin" className="text-[11px] text-gray-300 hover:text-gray-400 transition-colors">Admin</Link>
        </div>
      </footer>
    </div>
  );
}