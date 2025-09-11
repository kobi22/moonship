import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// =============================================================
// MoonShip Presale Landing Page (React + Tailwind CSS)
// Complete, self-contained implementation with:
// - 30-tier presale pricing & auto-splitting contributions across tiers
// - Countdown that flips phases: UPCOMING → LIVE → ENDED
// - Canvas starfield + meteors + slow, detailed mothership animation
// - **Airdrop** distribution (no claim portal): tokens are airdropped after presale
// - Console test suites for critical helpers (do not affect UI)
// =============================================================

// ---------- CONFIG ----------
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,            // number of tiers
  startPrice: 120_000,  // tokens per 1 SOL at tier 1
  endPrice: 80_000,     // tokens per 1 SOL at final tier
  totalCapSOL: 3000,    // sum of all tier caps
});

const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_000_000_000,
  },
  presale: {
    hardCapSOL: DEFAULT_TIERS.reduce((a, t) => a + t.capSOL, 0),
    softCapSOL: 500,
    liquidityPercent: 60,
    startISO: "2025-09-12T00:00:00Z",
    endISO: "2025-10-01T00:00:00Z",
    accepted: ["SOL", "USDC"],
    initialRaisedSOL: 1287.45,
    tiers: DEFAULT_TIERS,
  },
  // Airdrop plan (no claim portal): send tokens to contributor wallets after presale
  airdrop: {
    // When we plan to execute the airdrop (UTC); adjust as needed
    dropISO: "2025-10-02T00:00:00Z", // example: ~24h after presale end
    note: "All allocations will be airdropped directly to contributor wallets. No claim is required.",
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.xyz",
  },
};

// ---------- Helpers ----------
function generateLinearTiers({ tiers, startPrice, endPrice, totalCapSOL }) {
  const out = [];
  const step = tiers > 1 ? (endPrice - startPrice) / (tiers - 1) : 0;
  const perTierCap = Math.round((totalCapSOL / tiers) * 100) / 100; // 2dp
  let cumulative = 0;
  for (let i = 0; i < tiers; i++) {
    const price = Math.round(startPrice + step * i);
    cumulative = Math.round((cumulative + perTierCap) * 100) / 100;
    out.push({ pricePerSOL: price, capSOL: perTierCap, cumulativeSOL: cumulative });
  }
  // Fix potential rounding drift on last tier
  const drift = Math.round((cumulative - totalCapSOL) * 100) / 100;
  if (Math.abs(drift) > 0) {
    out[out.length - 1].capSOL = Math.round((out[out.length - 1].capSOL - drift) * 100) / 100;
    out[out.length - 1].cumulativeSOL = totalCapSOL;
  }
  return out;
}

/** Determine the current tier state from the raised amount. */
function getTierState(currentRaisedSOL, tiers) {
  let acc = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const tierStart = acc;
    const tierEnd = acc + t.capSOL;
    if (currentRaisedSOL < tierEnd) {
      return {
        currentTierIndex: i,
        tierRemainingSOL: Math.max(0, tierEnd - currentRaisedSOL),
        currentPrice: t.pricePerSOL,
        tierStart,
        tierEnd,
      };
    }
    acc = tierEnd;
  }
  const last = tiers[tiers.length - 1];
  return {
    currentTierIndex: tiers.length - 1,
    tierRemainingSOL: 0,
    currentPrice: last.pricePerSOL,
    tierStart: acc - last.capSOL,
    tierEnd: acc,
  };
}

/** Quote tokens for a given SOL amount, auto-splitting across tiers when needed. */
function quoteTokensForContribution(currentRaisedSOL, amountSOL, tiers) {
  let remaining = Math.max(0, amountSOL);
  let accRaised = currentRaisedSOL;
  let totalTokens = 0;
  const breakdown = [];
  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const t = tiers[i];
    const tierStart = tiers.slice(0, i).reduce((a, x) => a + x.capSOL, 0);
    const tierEnd = tierStart + t.capSOL;
    if (accRaised >= tierEnd) continue; // tier already filled
    const room = tierEnd - accRaised;
    const take = Math.min(room, remaining);
    if (take > 0) {
      const tokens = take * t.pricePerSOL;
      totalTokens += tokens;
      breakdown.push({ tier: i + 1, amountSOL: take, pricePerSOL: t.pricePerSOL, tokens });
      remaining -= take;
      accRaised += take;
    }
  }
  return { totalTokens, breakdown };
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

/** Convert milliseconds → { d, h, m, s } */
function msToDHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return { d, h, m, s: ss };
}

// =============================================================
// Component
// =============================================================
export default function MoonShipPresale() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapSOL;
  const start = useMemo(() => new Date(CONFIG.presale.startISO), []);
  const end = useMemo(() => new Date(CONFIG.presale.endISO), []);

  const [raisedSOL, setRaisedSOL] = useState(CONFIG.presale.initialRaisedSOL);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [contribution, setContribution] = useState(1);

  // Per-wallet allocation (mocked client-side; wire to backend/chain later)
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  // Animation canvas
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(DPR, DPR);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.2 + Math.random() * 0.8,
      r: 0.5 + Math.random() * 1.5,
      vx: -0.2 - Math.random() * 0.6,
      vy: 0.1 - Math.random() * 0.2,
    }));

    const meteors = Array.from({ length: 5 }, () => newMeteor());

    // 4K-style mothership (bigger, slower, detailed lighting)
    let mothership = {
      x: width + 500,
      y: height * 0.25,
      vx: -0.18,
      w: Math.max(300, Math.min(width * 0.45, 720)),
      h: Math.max(100, Math.min(height * 0.18, 220)),
    };

    function newMeteor() {
      const startX = width + Math.random() * width * 0.5;
      const startY = -50 + Math.random() * (height * 0.4);
      return { x: startX, y: startY, vx: -5 - Math.random() * 4, vy: 2 + Math.random() * 2, life: 0, maxLife: 120 + Math.random() * 80 };
    }

    function drawMothership() {
      ctx.save();
      ctx.translate(mothership.x, mothership.y);

      // Base hull with metallic gradient + soft bloom
      const hullGrad = ctx.createLinearGradient(-mothership.w, -mothership.h, mothership.w, mothership.h);
      hullGrad.addColorStop(0, "#1f2937");
      hullGrad.addColorStop(0.5, "#6b7280");
      hullGrad.addColorStop(1, "#94a3b8");
      ctx.fillStyle = hullGrad;
      ctx.shadowColor = "rgba(148,163,184,0.5)";
      ctx.shadowBlur = 60;
      ctx.beginPath();
      ctx.ellipse(0, 0, mothership.w, mothership.h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Specular highlight band
      const highlight = ctx.createLinearGradient(-mothership.w * 0.3, -mothership.h, mothership.w * 0.3, mothership.h);
      highlight.addColorStop(0, "rgba(255,255,255,0)");
      highlight.addColorStop(0.5, "rgba(255,255,255,0.18)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.ellipse(0, -mothership.h * 0.05, mothership.w * 0.95, mothership.h * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Panel lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * (mothership.w / 5), -mothership.h * 0.95);
        ctx.lineTo(i * (mothership.w / 5), mothership.h * 0.95);
        ctx.stroke();
      }
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(-mothership.w * 0.95, j * (mothership.h / 1.5));
        ctx.lineTo(mothership.w * 0.95, j * (mothership.h / 1.5));
        ctx.stroke();
      }

      // Windows (emissive bars)
      for (let i = -5; i <= 5; i++) {
        const winGrad = ctx.createLinearGradient(0, 0, 0, mothership.h * 0.3);
        winGrad.addColorStop(0, i % 2 === 0 ? "rgba(255,255,210,0.95)" : "rgba(190,225,255,0.95)");
        winGrad.addColorStop(1, "rgba(255,255,255,0.55)");
        ctx.fillStyle = winGrad;
        const w = mothership.w / 12;
        const h = mothership.h * 0.28;
        const x = i * (mothership.w / 6) - w / 2;
        const y = -h / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, h, 6);
        } else {
          const r = 6;
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
        }
        ctx.fill();
      }

      // Command dome
      const domeGrad = ctx.createRadialGradient(-mothership.w * 0.18, -mothership.h * 0.62, 8, -mothership.w * 0.18, -mothership.h * 0.62, mothership.h * 0.35);
      domeGrad.addColorStop(0, "rgba(210,240,255,0.95)");
      domeGrad.addColorStop(1, "rgba(100,160,240,0.2)");
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(-mothership.w * 0.18, -mothership.h * 0.62, mothership.h * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Engine glows
      for (let i = -2; i <= 2; i++) {
        const thr = ctx.createRadialGradient(-mothership.w, i * (mothership.h / 3), 2, -mothership.w, i * (mothership.h / 3), 28);
        thr.addColorStop(0, "rgba(96,165,250,1)");
        thr.addColorStop(1, "rgba(96,165,250,0)");
        ctx.fillStyle = thr;
        ctx.beginPath();
        ctx.arc(-mothership.w, i * (mothership.h / 3), 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle motion blur
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.ellipse(10, 2, mothership.w * 0.98, mothership.h * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();

      // Movement
      mothership.x += mothership.vx;
      if (mothership.x < -mothership.w * 1.2) {
        mothership.x = width + mothership.w * 1.2;
        mothership.y = height * (0.2 + Math.random() * 0.5);
      }
    }

    function draw() {
      // background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#030014");
      bg.addColorStop(1, "#0b0820");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // stars
      for (const s of stars) {
        s.x += s.vx * s.z;
        s.y += s.vy * s.z;
        if (s.x < -10) s.x = width + 10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;
        const twinkle = 0.6 + Math.sin((Date.now() * 0.002 + s.x) * s.z) * 0.4;
        ctx.globalAlpha = 0.4 + 0.6 * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.7 + 0.6 * twinkle), 0, Math.PI * 2);
        ctx.fillStyle = "#a2b6ff";
        ctx.fill();
      }

      // meteors
      ctx.globalAlpha = 1;
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life++;
        const trail = 50;
        const angle = Math.atan2(m.vy, m.vx);
        const tx = Math.cos(angle) * trail;
        const ty = Math.sin(angle) * trail;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - tx, m.y - ty);
        grad.addColorStop(0, "#b3e7ff");
        grad.addColorStop(1, "rgba(179,231,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - tx, m.y - ty);
        ctx.stroke();
        if (m.life > m.maxLife || m.x < -100 || m.y > height + 100) {
          meteors[i] = newMeteor();
        }
      }

      // mothership
      drawMothership();

      requestAnimationFrame(draw);
    }

    let raf = requestAnimationFrame(draw);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
      // update mothership bounds
      mothership.w = Math.max(300, Math.min(width * 0.45, 720));
      mothership.h = Math.max(100, Math.min(height * 0.18, 220));
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Live countdown tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Phases
  let phase = "upcoming";
  if (now >= start && now <= end) phase = "live";
  if (now > end) phase = "ended";

  const timeLeftMs = Math.max(0, (phase === "upcoming" ? start : end).getTime() - now.getTime());
  const { d, h, m, s } = msToDHMS(timeLeftMs);

  // Tier math / quote preview
  const { currentTierIndex, tierRemainingSOL, currentPrice } = getTierState(raisedSOL, TIERS);
  const estQuote = quoteTokensForContribution(raisedSOL, safeNum(contribution), TIERS);

  const percent = Math.min(100, (raisedSOL / HARD_CAP) * 100);
  const soldOut = raisedSOL >= HARD_CAP;

  function handleConnect() {
    setConnected(true);
  }

  function handleContribute() {
    if (!connected) return alert("Connect your wallet first.");
    const add = safeNum(contribution);
    if (!isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, HARD_CAP - raisedSOL);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    // Quote tokens specifically for the accepted delta at current state
    const q = quoteTokensForContribution(raisedSOL, delta, TIERS);
    setRaisedSOL((x) => +(x + delta).toFixed(2));
    setUserAllocationTokens((t) => +(t + q.totalTokens).toFixed(0));
  }

  // Airdrop helpers
  const airdropDate = useMemo(() => new Date(CONFIG.airdrop.dropISO), []);
  const airdropSoon = now >= end; // show notice once presale has ended

  return (
    <div className="relative min-h-screen text-white overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Starfield */}
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Veil */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(88,28,135,0.35),rgba(2,6,23,0.1)_60%,transparent)]" />

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="font-bold tracking-wide text-white/90">MoonShip</span>
            <span className="text-white/50 text-sm">$MSHP</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#presale" className="hover:text-white">Presale</a>
            <a href="#tokenomics" className="hover:text-white">Tokenomics</a>
            <a href="#roadmap" className="hover:text-white">Roadmap</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white text-sm">X</a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white text-sm">TG</a>
            <button onClick={handleConnect} className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-lg transition ${connected ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30" : "bg-indigo-500 hover:bg-indigo-600"}`}>
              {connected ? "Wallet Connected" : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Presale Card */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-10 md:pt-28 md:pb-14">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Launching <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">MoonShip</span>
              </h1>
              <p className="mt-4 text-white/80 max-w-xl">
                Secure your spot on the mission. Join the $MSHP presale and help seed liquidity on Raydium. <b>Tiered pricing</b>, fair launch mechanics, and locked LP for stability.
              </p>

              {/* Countdown */}
              <div className="mt-6 inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-4 backdrop-blur">
                <div className="text-xs uppercase tracking-wider text-white/60">{phase === "upcoming" ? "Presale starts in" : phase === "live" ? "Presale ends in" : soldOut ? "Hard Cap Reached" : "Presale ended"}</div>
                <TimeBox label="Days" value={d} />
                <TimeBox label="Hours" value={h} />
                <TimeBox label="Minutes" value={m} />
                <TimeBox label="Seconds" value={s} />
              </div>

              {/* Tier snapshot */}
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <InfoCard label="Current Tier" value={`${currentTierIndex + 1} / ${TIERS.length}`} />
                <InfoCard label="Current Price" value={`${currentPrice.toLocaleString()} MSHP / SOL`} />
                <InfoCard label="Remaining in Tier" value={`${tierRemainingSOL.toFixed(2)} SOL`} />
                <InfoCard label="Total Hard Cap" value={`${HARD_CAP.toLocaleString()} SOL`} />
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
                <Badge>Soft Cap {CONFIG.presale.softCapSOL} SOL</Badge>
                <Badge>Hard Cap {HARD_CAP} SOL</Badge>
                <Badge>{currentPrice.toLocaleString()} MSHP / SOL</Badge>
                <Badge>Accepts {CONFIG.presale.accepted.join(" • ")}</Badge>
              </div>
            </div>

            {/* Presale Card */}
            <div id="presale" className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 shadow-2xl">
              <h3 className="text-xl font-semibold">Join the Presale</h3>
              <p className="text-sm text-white/70 mt-1">Tiered pricing: your contribution auto-splits across tiers if needed.</p>

              {/* Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Raised</span>
                  <span>{raisedSOL.toLocaleString()} / {HARD_CAP} SOL</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-3 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1 text-right text-[11px] text-white/60">{percent.toFixed(1)}%</div>
              </div>

              {/* Contribute or Airdrop notice */}
              {phase === "live" && !soldOut ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/60">Amount (SOL)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={contribution}
                      onChange={(e) => setContribution(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl bg-slate-800/70 border border-white/10 px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400/50"
                      placeholder="1.0"
                    />
                    <div className="mt-2 text-[12px] text-white/60">You’ll receive ~ <span className="text-white">{estQuote.totalTokens.toLocaleString()}</span> MSHP</div>
                    {estQuote.breakdown.length > 1 && (
                      <div className="mt-2 text-[11px] text-white/50">
                        Split across tiers: {estQuote.breakdown.map((b,i) => `${b.amountSOL.toFixed(2)} SOL @ ${b.pricePerSOL.toLocaleString()}`).join(" • ")}
                      </div>
                    )}
                  </div>
                  <button onClick={handleContribute} className="w-full rounded-xl px-4 py-3 font-semibold shadow-lg transition bg-indigo-500 hover:bg-indigo-600">Contribute</button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm">
                    <div className="font-semibold">Airdrop</div>
                    <div className="text-white/70 mt-1">{CONFIG.airdrop.note}</div>
                    <div className="text-white/60 mt-1">Scheduled: {airdropDate.toUTCString()}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoCard label="Your Allocation" value={`${userAllocationTokens.toLocaleString()} MSHP`} />
                    <InfoCard label="Status" value={airdropSoon ? "Queued for airdrop" : "Pending presale end"} />
                  </div>
                  {!connected && <div className="text-xs text-white/60">Connect your wallet to record the destination for airdrop.</div>}
                </div>
              )}

              <div className="mt-4 text-[12px] text-white/60">
                Liquidity: {CONFIG.presale.liquidityPercent}% of raise paired with MSHP on Raydium after presale.
              </div>

              {/* Tier Ladder */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="text-sm font-semibold">Price Ladder</div>
                <div className="mt-3 max-h-56 overflow-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="text-white/60">
                      <tr>
                        <th className="py-1 pr-2">Tier</th>
                        <th className="py-1 pr-2">Price (MSHP/SOL)</th>
                        <th className="py-1 pr-2">Cap (SOL)</th>
                        <th className="py-1 pr-2">Cumulative (SOL)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIERS.map((t, i) => (
                        <tr key={i} className={i === currentTierIndex ? "bg-white/5" : ""}>
                          <td className="py-1 pr-2">{i + 1}</td>
                          <td className="py-1 pr-2">{t.pricePerSOL.toLocaleString()}</td>
                          <td className="py-1 pr-2">{t.capSOL}</td>
                          <td className="py-1 pr-2">{t.cumulativeSOL}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
                <Stat label="Your Allocation (Preview)" value={`${(estQuote.totalTokens).toLocaleString()} MSHP`} />
                <Stat label="Distribution" value="Airdrop to wallet" />
                <Stat label="Network" value="Solana" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section id="tokenomics" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-3xl font-bold">Tokenomics</h2>
          <p className="text-white/70 mt-1">Transparent distribution designed for long-term sustainability.</p>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <TokenCard title="Presale" percent={30} desc="300,000,000 MSHP" />
            <TokenCard title="Liquidity" percent={20} desc="200,000,000 MSHP (LP locked)" />
            <TokenCard title="Community/Rewards" percent={25} desc="250,000,000 MSHP" />
            <TokenCard title="Team" percent={15} desc="150,000,000 MSHP" />
            <TokenCard title="Marketing" percent={10} desc="100,000,000 MSHP" />
            <div className="rounded-3xl border border-white/10 p-6 bg-slate-900/60">
              <h4 className="font-semibold">Key Params</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/70 list-disc list-inside">
                <li>Total Supply: 1,000,000,000</li>
                <li>Decimals: 9</li>
                <li>Chain: Solana</li>
                <li>Ticker: $MSHP</li>
                <li>Initial Price: Tiered (see ladder)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-3xl font-bold">Roadmap</h2>
          <div className="mt-8 grid md:grid-cols-4 gap-6">
            <RoadItem phase="Q3 2025" title="Presale & Community" points={["Presale launch", "LP plan & audits", "TG/X growth"]} />
            <RoadItem phase="Q4 2025" title="DEX Listing" points={["Raydium listing", "LP lock", "Airdrop execution"]} />
            <RoadItem phase="Q1 2026" title="Utility Launch" points={["Staking rewards", "Partnerships", "CEX talks"]} />
            <RoadItem phase="Q2 2026" title="Expansion" points={["Ecosystem grants", "Mobile wallet perks", "Global campaigns"]} />
          </div>
        </div>
      </section>

      {/* How to Join */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-3xl font-bold">How to Join</h2>
          <ol className="mt-6 grid md:grid-cols-3 gap-6 list-decimal list-inside text-white/80">
            <li className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">Install Phantom or Backpack wallet.</li>
            <li className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">Connect wallet & choose SOL amount.</li>
            <li className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">Confirm transaction. Tokens are airdropped after presale.</li>
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <FAQ q="When does the presale end?" a={`Ends on ${new Date(CONFIG.presale.endISO).toUTCString()}.`} />
            <FAQ q="Which currencies are accepted?" a={`Contribute in ${CONFIG.presale.accepted.join(", ")}.`} />
            <FAQ q="Is liquidity locked?" a="Yes — LP tokens are locked after listing to reduce rug risk." />
            <FAQ q="How do I receive tokens?" a="All tokens are airdropped to the wallet that contributed—no claim required." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-white/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} MoonShip. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href={CONFIG.socials.website} className="hover:text-white">Website</a>
            <a href={CONFIG.socials.twitter} className="hover:text-white">X</a>
            <a href={CONFIG.socials.telegram} className="hover:text-white">Telegram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------- Small UI helpers ----------
function TimeBox({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-extrabold tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1 text-xs">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400" />
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-white/10 p-3">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="text-white/60 text-xs">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function TokenCard({ title, percent, desc }) {
  return (
    <div className="rounded-3xl border border-white/10 p-6 bg-slate-900/60">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-white/70 text-sm">{percent}%</span>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-white/70">{desc}</p>
    </div>
  );
}

function RoadItem({ phase, title, points = [] }) {
  return (
    <div className="rounded-3xl border border-white/10 p-6 bg-slate-900/60">
      <div className="text-xs text-white/60">{phase}</div>
      <div className="mt-1 font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-white/70 list-disc list-inside">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left px-5 py-4 flex items-center justify-between">
        <span className="font-medium">{q}</span>
        <span className="text-white/60">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 pb-5 text-white/70 text-sm">{a}</div>}
    </div>
  );
}

function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]"
    >
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" stroke="url(#g1)" strokeWidth="2.5" fill="rgba(3,7,18,0.6)" />
      <path d="M18 36c6-10 22-18 30-10 8 8-2 24-12 22-8-2-10-6-18-12z" fill="url(#g1)" opacity="0.9" />
      <path d="M44 18c-1 4-5 7-9 8 2-4 5-8 9-8z" fill="#e2e8f0" opacity="0.7" />
      <circle cx="48" cy="24" r="2" fill="#e2e8f0" />
    </svg>
  );
}

// =============================================================
// Console Tests (run once in browser; safe to ship)
// =============================================================
(function runMoonShipTestsOnce(){
  if (typeof window === 'undefined') return;
  if (window.__MSHP_TESTS__) return; window.__MSHP_TESTS__ = true;

  // msToDHMS tests
  const msCases = [
    {ms:0, expect:{d:0,h:0,m:0,s:0}},
    {ms:1000, expect:{d:0,h:0,m:0,s:1}},
    {ms:61_000, expect:{d:0,h:0,m:1,s:1}},
    {ms:3_600_000, expect:{d:0,h:1,m:0,s:0}},
    {ms:90_061_000, expect:{d:1,h:1,m:1,s:1}},
    {ms:86_400_000, expect:{d:1,h:0,m:0,s:0}},
    {ms:-500, expect:{d:0,h:0,m:0,s:0}},
  ];
  for (const c of msCases){
    const out = msToDHMS(c.ms);
    const ok = out.d===c.expect.d && out.h===c.expect.h && out.m===c.expect.m && out.s===c.expect.s;
    console[ok?'debug':'warn']('[msToDHMS]', ok?'PASS':'FAIL', c.ms, out, 'expected', c.expect);
  }

  // generateLinearTiers tests
  const tiers = generateLinearTiers({tiers: 30, startPrice: 120_000, endPrice: 80_000, totalCapSOL: 3000});
  const sumCap = tiers.reduce((a,t)=>a+t.capSOL,0);
  const okLen = tiers.length===30;
  const okCap = Math.abs(sumCap-3000) < 1e-6;
  const okEnds = tiers[0].pricePerSOL===120000 && tiers[29].pricePerSOL===80000;
  console[okLen&&okCap&&okEnds?'debug':'warn']('[generateLinearTiers]', (okLen&&okCap&&okEnds)?'PASS':'FAIL', {okLen, okCap, okEnds, sumCap});

  // getTierState / quoteTokensForContribution tests
  const sample = [ {pricePerSOL:100, capSOL:1}, {pricePerSOL:80, capSOL:1} ];
  const st05 = getTierState(0.5, sample);
  const st12 = getTierState(1.2, sample);
  console.debug('[getTierState] 0.5', st05, '1.2', st12);
  const q1 = quoteTokensForContribution(0, 0.5, sample);      // should be 50 tokens @ 100
  const q2 = quoteTokensForContribution(0.8, 0.5, sample);    // crosses into tier 2
  console.debug('[quoteTokensForContribution] q1', q1, 'q2', q2);
})();
