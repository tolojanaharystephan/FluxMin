"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import {
  Mail,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Workflow,
  Building2,
  Sparkles,
} from "lucide-react";
import { getDefaultHomePath } from "@/lib/home-path";

const easeOut = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.07, duration: 0.55, ease: easeOut },
  }),
};

const features = [
  {
    icon: Sparkles,
    title: "IA locale assistive",
    text: "OCR, résumé et routage — validation humaine obligatoire",
  },
  {
    icon: Shield,
    title: "Souveraineté",
    text: "Données dans le périmètre, sans cloud tiers sensible",
  },
  {
    icon: Workflow,
    title: "Flux tracés",
    text: "Interne, externe et transmission multi-directions",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      router.push(getDefaultHomePath(user?.role));
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects");
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#07110f] text-foreground">
      {/* Atmospheric mesh — FlexFlow soft depth, teal not purple */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,rgba(20,184,166,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_80%,rgba(15,118,110,0.18),transparent_50%),radial-gradient(ellipse_50%_40%_at_50%_50%,rgba(8,47,43,0.9),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* Enix-style floating orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        animate={{ y: [0, -28, 0], x: [0, 12, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-10 right-[38%] h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl"
        animate={{ y: [0, 22, 0], x: [0, -16, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-16 top-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl"
        animate={{ y: [0, -16, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      {/* Brand panel */}
      <section className="relative z-10 hidden w-[52%] flex-col justify-between p-12 xl:p-16 lg:flex">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/20 ring-1 ring-teal-400/30 backdrop-blur-sm">
            <Mail className="h-5 w-5 text-teal-300" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.18em] text-teal-100/90 uppercase">
            FluxMin
          </span>
        </motion.div>

        <div className="relative max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
            className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl"
          >
            FluxMin
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.22, ease: easeOut }}
            className="mt-5 max-w-md text-lg leading-relaxed text-teal-50/70"
          >
            Gestion et automatisation intelligente des courriers ministériels —
            tracés, sécurisés, assistés localement.
          </motion.p>

          <ul className="mt-10 space-y-3">
            {features.map((item, i) => (
              <motion.li
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 backdrop-blur-md"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
                  <item.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white/95">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{item.text}</span>
                </span>
              </motion.li>
            ))}
          </ul>

          {/* Floating preview chips — Enix soft motion */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-6 top-0 hidden xl:block"
            animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-52 rounded-2xl border border-white/10 bg-[#0c1a17]/90 p-3 shadow-2xl shadow-teal-950/40 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-[10px] text-teal-200/70">
                <Building2 className="h-3 w-3" />
                Courrier entrant
              </div>
              <div className="h-2 w-3/4 rounded-full bg-teal-400/25" />
              <div className="mt-2 h-2 w-1/2 rounded-full bg-white/10" />
              <div className="mt-3 flex gap-1.5">
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-200">Priorité</span>
                <span className="rounded-md bg-teal-500/20 px-1.5 py-0.5 text-[9px] text-teal-200">DSI</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-xs text-white/35"
        >
          Plateforme gouvernementale · v1.0
        </motion.p>
      </section>

      {/* Form panel — FlexFlow clean surface */}
      <section className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.15, ease: easeOut }}
          className="w-full max-w-[420px]"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0d1614]/80 p-8 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-10">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/25">
                <Mail className="h-5 w-5" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                FluxMin
              </span>
            </div>

            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mb-8">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
                Bon retour
              </h2>
              <p className="mt-2 text-sm text-white/50">
                Connectez-vous pour accéder à votre espace courrier
              </p>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-white/70">
                  Adresse email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-400/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent.courrier.mfa@fluxmin.gouv.fr"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 transition-colors focus-visible:border-teal-500/50 focus-visible:ring-teal-500/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </motion.div>

              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/70">
                    Mot de passe
                  </Label>
                  <span className="text-xs text-teal-300/70">Mot de passe oublié ?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-400/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 pr-10 transition-colors focus-visible:border-teal-500/50 focus-visible:ring-teal-500/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/80"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-teal-500"
                />
                <Label htmlFor="remember" className="text-sm font-normal text-white/50">
                  Se souvenir de moi
                </Label>
              </motion.div>

              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="group h-11 w-full rounded-xl bg-teal-500 text-teal-950 shadow-lg shadow-teal-900/30 transition-all hover:bg-teal-400 hover:shadow-teal-700/25"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-950 border-t-transparent" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="mt-7">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] tracking-wider uppercase">
                  <span className="bg-[#0d1614] px-3 text-white/35">Démo rapide</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.07] hover:text-white"
                  onClick={() => {
                    setEmail("agent.courrier.mfa@fluxmin.gouv.fr");
                    setPassword("fluxmin2026");
                  }}
                >
                  Agent Courrier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.07] hover:text-white"
                  onClick={() => {
                    setEmail("responsable.dsi.mfa@fluxmin.gouv.fr");
                    setPassword("fluxmin2026");
                  }}
                >
                  Responsable
                </Button>
              </div>
            </motion.div>
          </div>

          <p className="mt-6 text-center text-[11px] text-white/30">
            Accès réservé aux agents autorisés
          </p>
        </motion.div>
      </section>
    </div>
  );
}
