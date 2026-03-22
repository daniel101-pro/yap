'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronLeft, EyeOff, ShoppingBag, ShieldCheck, Mail } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function HeroSection() {
  const { email, setEmail, login } = useStore();
  const [step, setStep] = useState<'hero' | 'email' | 'verify'>('hero');
  const [emailError, setEmailError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.7, 1]);

  const handleEmailSubmit = () => {
    if (!email.endsWith('@exeter.ac.uk')) {
      setEmailError('Must be an @exeter.ac.uk email');
      return;
    }
    setEmailError('');
    setStep('verify');
  };

  return (
    <div ref={containerRef} className="bg-[#0A0A0A] relative">
      {/* Video Background — fixed behind everything */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="/exeter-campus.mp4" type="video/mp4" />
        </video>
        {/* Base gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" />
        {/* Scroll-reactive darkening overlay */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 'hero' && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* First screen — hero viewport */}
            <div className="min-h-dvh flex flex-col relative z-10">
              {/* Nav */}
              <motion.header
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="flex items-center justify-between px-6 lg:px-12 py-5 w-full"
              >
                <span className="text-[18px] lg:text-[22px] font-black tracking-tight text-white">Y_</span>

                <div className="flex items-center gap-2 lg:gap-3">
                  <button
                    onClick={() => setStep('email')}
                    className="px-4 lg:px-6 py-2 rounded-full bg-white/10 text-white/80 text-[13px] lg:text-[14px] font-medium hover:bg-white/15 transition-colors duration-200 min-h-[40px]"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setStep('email')}
                    className="px-4 lg:px-6 py-2 rounded-full border border-white/20 text-white text-[13px] lg:text-[14px] font-medium hover:bg-white/5 transition-colors duration-200 min-h-[40px]"
                  >
                    Sign up
                  </button>
                </div>
              </motion.header>

              {/* Social proof strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex items-center justify-center gap-4 md:gap-16 px-6 py-4"
              >
                {['20,000+ Students', 'University of Exeter', 'Verified Only'].map((text) => (
                  <span key={text} className="text-[9px] md:text-[11px] font-semibold text-white/80 tracking-[0.08em] md:tracking-[0.1em] uppercase whitespace-nowrap">
                    {text}
                  </span>
                ))}
              </motion.div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Hero — massive headline + CTA */}
              <div className="px-6 lg:px-16 pb-6 lg:flex lg:items-end lg:justify-between lg:gap-16 max-w-7xl mx-auto w-full">
                {/* Left — headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[clamp(48px,12vw,80px)] leading-[0.9] font-black tracking-[-0.04em] text-white mb-10 lg:mb-0 lg:flex-1"
                >
                  Your campus.
                  <br />
                  <span className="text-exeter-glow">Unfiltered.</span>
                </motion.h1>

                {/* Right — CTA + subtext */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-5 lg:flex-none lg:w-[340px] lg:pb-1"
                >
                  <button
                    onClick={() => setStep('email')}
                    className="group flex items-center justify-center gap-3 bg-white text-[#0A0A0A] px-8 py-4 rounded-full text-[15px] lg:text-[16px] font-semibold tracking-[-0.01em] transition-all duration-300 hover:bg-white/90 min-h-[52px] w-full max-w-xs lg:max-w-none"
                  >
                    <span className="w-5 h-5 bg-exeter rounded-md flex items-center justify-center text-[10px] font-black text-white">Y</span>
                    Start Yapping
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
                  </button>

                  <p className="text-[14px] text-white/40 leading-[1.5] max-w-xs lg:max-w-none">
                    Anonymous posts. Campus marketplace.
                    <br />
                    No scrolling. No vanity. Just your uni.
                  </p>
                </motion.div>
              </div>

              {/* Bottom divider + features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="lg:max-w-3xl lg:mx-auto lg:w-full lg:mb-8"
              >
                <div className="h-px bg-gradient-to-r from-transparent via-exeter-glow/30 to-transparent" />
                <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                  {[
                    { icon: EyeOff, label: 'Anonymous' },
                    { icon: ShoppingBag, label: 'Marketplace' },
                    { icon: ShieldCheck, label: 'Verified' },
                  ].map((f) => (
                    <div key={f.label} className="py-5 flex flex-col items-center">
                      <f.icon className="w-5 h-5 text-white/40" strokeWidth={1.5} aria-hidden="true" />
                      <p className="text-[9px] lg:text-[10px] font-semibold text-white/25 mt-1.5 tracking-[0.12em] uppercase">{f.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Scroll section — fades to black with footer */}
            <div className="relative z-10">
              {/* Spacer that lets the darkening happen */}
              <div className="h-[20vh]" />

              {/* Footer — fully black background */}
              <footer className="bg-black relative z-10">
                <div className="max-w-4xl mx-auto px-6 pt-16 pb-10">
                  {/* Brand */}
                  <div className="mb-16">
                    <h2 className="text-[clamp(36px,10vw,56px)] font-black tracking-[-0.04em] text-white leading-[0.95] mb-6">
                      YAP
                    </h2>
                    <p className="text-[15px] text-white/40 leading-[1.6] max-w-xs">
                      The anonymous social network for University of Exeter students. Verified. Unfiltered. Yours.
                    </p>
                  </div>

                  {/* Feature grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8 mb-16">
                    {[
                      { title: 'Anonymous Posts', desc: 'Speak freely without judgement' },
                      { title: 'Campus Marketplace', desc: 'Buy & sell with verified students' },
                      { title: 'Verified Only', desc: '@exeter.ac.uk emails required' },
                      { title: 'Zero Vanity', desc: 'No followers, no likes, no clout' },
                    ].map((item) => (
                      <div key={item.title}>
                        <h3 className="text-[14px] font-semibold text-white mb-1.5">{item.title}</h3>
                        <p className="text-[12px] text-white/30 leading-[1.5]">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA repeat */}
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setTimeout(() => setStep('email'), 400);
                    }}
                    className="group flex items-center justify-center gap-3 bg-white text-[#0A0A0A] px-8 py-4 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-all duration-300 hover:bg-white/90 min-h-[52px] w-full mb-16"
                  >
                    <span className="w-5 h-5 bg-exeter rounded-md flex items-center justify-center text-[10px] font-black text-white">Y</span>
                    Join the conversation
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" strokeWidth={2.5} />
                  </button>

                  {/* Bottom bar */}
                  <div className="border-t border-white/[0.06] pt-8">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-black tracking-tight text-white/40">Y_</span>
                      <div className="flex items-center gap-6">
                        {['Privacy', 'Terms', 'Contact'].map((link) => (
                          <button
                            key={link}
                            className="text-[12px] text-white/25 hover:text-white/50 transition-colors duration-200"
                          >
                            {link}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-white/15 mt-6">
                      © 2026 YAP. Not affiliated with the University of Exeter.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </motion.div>
        )}

        {step === 'email' && (
          <motion.div
            key="email"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-dvh flex flex-col px-6 relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.05, duration: 0.6 }}
              className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
            >
              <button
                onClick={() => setStep('hero')}
                aria-label="Go back"
                className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200 mb-16 min-h-[44px] self-start"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-[36px] font-black tracking-[-0.03em] leading-[0.95] text-white mb-4">
                Verify your
                <br />
                <span className="text-exeter-glow">identity.</span>
              </h2>

              <p className="text-[15px] text-white/40 leading-[1.6] mb-12">
                Your @exeter.ac.uk email keeps YAP real.
                <br />
                Only verified students get in.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email-input" className="text-[11px] font-semibold text-white/25 uppercase tracking-[0.1em] mb-2.5 block">
                    University Email
                  </label>
                  <input
                    id="email-input"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    placeholder="you@exeter.ac.uk"
                    type="email"
                    autoFocus
                    autoComplete="email"
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl px-5 py-4 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-exeter-glow/40 transition-all duration-200 min-h-[52px]"
                  />
                  {emailError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="text-[12px] text-red-400 font-medium mt-2.5"
                    >
                      {emailError}
                    </motion.p>
                  )}
                </div>

                <button
                  onClick={handleEmailSubmit}
                  className="w-full bg-white text-[#0A0A0A] py-4 rounded-full font-semibold text-[15px] tracking-[-0.01em] hover:bg-white/90 transition-colors duration-200 min-h-[52px]"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-dvh flex flex-col items-center justify-center px-6 relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.05, duration: 0.6 }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                className="flex justify-center mb-8"
              >
                <Mail className="w-10 h-10 text-exeter-glow" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-[28px] font-black tracking-[-0.02em] text-white mb-2">
                Check your inbox
              </h2>
              <p className="text-[15px] text-white/40 mb-1">We sent a magic link to</p>
              <p className="text-[15px] font-semibold text-exeter-glow mb-12">{email}</p>

              <button
                onClick={() => login()}
                className="w-full bg-white text-[#0A0A0A] py-4 rounded-full font-semibold text-[15px] tracking-[-0.01em] hover:bg-white/90 transition-colors duration-200 min-h-[52px] mb-4"
              >
                I&apos;ve verified (demo)
              </button>
              <button
                onClick={() => setStep('email')}
                className="text-[13px] text-white/30 hover:text-white/60 transition-colors duration-200 min-h-[44px]"
              >
                Use a different email
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
