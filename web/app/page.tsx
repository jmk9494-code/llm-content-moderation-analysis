'use client';

import Link from 'next/link';
import { Shield, BarChart3, Lock, Users, ArrowRight, BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 relative">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <div className="flex">
            </div>

            <h1 className="mt-10 max-w-lg text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl font-display">
              Algorithmic Arbiters
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              A comprehensive, automated auditing system for Large Language Models. We continuously test AI safety filters against contentious topics to track strictness drifts, bias, and refusal rates over time.
            </p>

            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/dashboard"
                className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all hover:scale-105 flex items-center gap-2"
              >
                Launch Dashboard <BarChart3 className="h-4 w-4" />
              </Link>
              <a href="https://github.com/jmk9494-code/llm-content-moderation-analysis" target="_blank" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-2 hover:text-indigo-600 transition-colors">
                View Source Code <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
            <div className="relative mx-auto w-[22rem] max-w-full drop-shadow-xl">
              <div className="absolute top-0 -left-4 bg-indigo-100 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 bg-purple-100 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 relative">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Safety Audit Log</div>
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      System Active
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={`mt-1 h-2 w-2 rounded-full ${i === 1 ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-2 bg-slate-50 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">Methodology</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How we audit the AI ecosystem
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              We move beyond simple benchmarks. By simulating real-world, adversarial user prompts, we uncover how models truly behave when faced with policy boundaries.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <Shield className="h-5 w-5 flex-none text-indigo-600" />
                  Global Scope (US & China)
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">We audit models from OpenAI, Google, Anthropic, as well as top Chinese labs like DeepSeek and Alibaba (Qwen) to compare regional safety standards.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <BarChart3 className="h-5 w-5 flex-none text-indigo-600" />
                  Longitudinal Tracking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Audits run automatically every week. We visualize how model refusal rates drift over time as companies update their alignment.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-900">
                  <Lock className="h-5 w-5 flex-none text-indigo-600" />
                  Adversarial Stress-Testing
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                  <p className="flex-auto">Our <strong>Strategy Analysis</strong> engine tests models against "Jailbreak" attempts and subtle borderline queries to measure true robustness, not just basic compliance.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Footer / Attribution */}
      <footer className="py-12 text-center text-slate-500 text-sm">
        <p>Created & Maintained by <span className="font-semibold text-slate-900">Jacob Kandel</span></p>
        <p className="mt-1">Student at the <span className="font-semibold text-slate-900">University of Chicago</span> 🎓</p>
        <div className="mt-8 pt-8 border-t border-slate-200 max-w-xs mx-auto">
          <p>© {new Date().getFullYear()} Algorithmic Arbiters</p>
        </div>
      </footer>
    </main>
  );
}
