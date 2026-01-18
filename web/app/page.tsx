'use client';

import Link from 'next/link';
import { Shield, BarChart3, Lock, ArrowRight, Eye, Scale, Server } from 'lucide-react';
import LandingSection from '@/components/landing/LandingSection';
import ScrollIndicator from '@/components/landing/ScrollIndicator';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <main className="bg-white font-sans overflow-x-hidden snap-y snap-mandatory h-screen overflow-y-scroll no-scrollbar scroll-smooth">

      {/* 1. The Hook: Who watches the watchers? */}
      <LandingSection className="bg-slate-50 relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-6 shadow-sm border border-indigo-100"
          >
            <Eye className="h-8 w-8 text-indigo-600" />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 font-display leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Into</span> the black box.
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            As AI models become the world's moderators, their hidden biases shape our reality. We built <strong>Algorithmic Arbiters</strong> to shine a light on the black box.
          </p>
        </div>
        <ScrollIndicator />
      </LandingSection>

      {/* 2. The Problem: Bias is Inevitable */}
      <LandingSection className="bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 relative">
            {/* Abstract visual for bias */}
            <div className="aspect-square bg-slate-50 rounded-3xl border border-slate-200 p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>

              <div className="relative z-10 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <div className="text-sm font-mono text-slate-500">I cannot answer that...</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 translate-x-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <div className="text-sm font-mono text-slate-500">Here is the information...</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 translate-x-8 opacity-50">
                  <div className="h-2 w-16 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <Scale className="h-6 w-6 text-rose-600" />
            </div>
            <h2 className="text-4xl font-bold text-slate-900">Silence is a Choice.</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              When an AI refuses a prompt, it's making a moral judgment. Is it safety? Or is it over-censorship?
              <br /><br />
              We analyze thousands of refusals to map the <strong>political and ethical boundaries</strong> of every major LLM.
            </p>
          </div>
        </div>
      </LandingSection>

      {/* 3. The Scale: Continuous Auditing */}
      <LandingSection className="bg-slate-900 text-white">
        <div className="text-center max-w-4xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-5xl font-bold">The Dataset</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-indigo-400 mb-2">Weekly</div>
              <div className="text-slate-400">Automated Audits</div>
            </div>
            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-emerald-400 mb-2">15+</div>
              <div className="text-slate-400">Models Tracked</div>
            </div>
            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-amber-400 mb-2">10k+</div>
              <div className="text-slate-400">Data Points</div>
            </div>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto">
            From OpenAI to Anthropic, from Meta to Mistral. We track the entire ecosystem so you don't have to.
          </p>
        </div>
      </LandingSection>

      {/* 4. The Solution: Call to Action */}
      <LandingSection className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="text-center relative z-10 space-y-8">
          <div className="inline-flex p-4 rounded-full bg-indigo-500/20 mb-4 animate-pulse">
            <Server className="h-8 w-8 text-indigo-300" />
          </div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight">
            See the Data.
          </h2>
          <p className="text-xl text-indigo-200 max-w-xl mx-auto">
            Explore the interactive dashboard to compare models, visualize bias, and time-travel through censorship history.
          </p>
          <div className="pt-8">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-900 transition-all duration-200 bg-white font-display rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-50 hover:scale-105 hover:shadow-2xl"
            >
              Launch Interactive Dashboard
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <footer className="mt-16 text-center text-slate-500 text-xs opacity-60">
            <p>© {new Date().getFullYear()} Algorithmic Arbiters • Research by Jacob Kandel (UChicago)</p>
          </footer>
        </div>
      </LandingSection>

    </main>
  );
}
