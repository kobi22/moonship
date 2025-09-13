import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

// =============================================================
// CONFIG
// =============================================================
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 120_000, // tokens per SOL at tier 1
  endPrice: 80_000,    // tokens per SOL at final tier
  totalCapSOL: 3_000_000, // ~3M SOL ≈ $30M (assuming $10 per SOL)
});

const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_500_000_000,
  },
  presale: {
    hardCapSOL: DEFAULT_TIERS.reduce((a, t) => a + t.capSOL, 0),
    softCapSOL: 500_000,
    liquidityPercent: 60,
    accepted: ["SOL", "USDC"],
    initialRaisedSOL: 0,
    tiers: DEFAULT_TIERS,
  },
  airdrop: {
    dropISO: "2025-12-01T00:00:00Z",
    note: "All allocations will be airdropped directly to contributor wallets. No claim is required.",
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.shop",
  },
};

// =============================================================
// Wallet Providers wrapper
// =============================================================
export default function MoonShipPresale() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = clusterApiUrl(network);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MoonShipInner />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// =============================================================
// Inner Component (UI)
// =============================================================
function MoonShipInner() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapSOL;

  const [raisedSOL, setRaisedSOL] = useState(CONFIG.presale.initialRaisedSOL);
  const [contribution, setContribution] = useState(1);
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  // Animated starfield background
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2,
      vx: -0.3 - Math.random() * 0.4,
    }));

    function draw() {
      ctx.fillStyle = "#030014";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#a2b6ff";
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.x += s.vx;
        if (s.x < 0) s.x = width;
      }
      requestAnimationFrame(draw);
    }
    draw();
  }, []);

  // Presale contribution logic
  const { currentTierIndex, tierRemainingSOL, currentPrice } = getTierState(
    raisedSOL,
    TIERS
  );
  const estQuote = quoteTokensForContribution(
    raisedSOL,
    safeNum(contribution),
    TIERS
  );

  const percent = Math.min(100, (raisedSOL / HARD_CAP) * 100);
  const soldOut = raisedSOL >= HARD_CAP;

  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = safeNum(contribution);
    if (!isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, HARD_CAP - raisedSOL);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    const q = quoteTokensForContribution(raisedSOL, delta, TIERS);
    setRaisedSOL((x) => +(x + delta).toFixed(2));
    setUserAllocationTokens((t) => +(t + q.totalTokens).toFixed(0));
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background */}
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg">
            🚀 MoonShip Presale
          </div>
          <div className="flex items-center gap-3">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">X</a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">TG</a>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Presale */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-5xl font-extrabold">MoonShip Presale</h1>
        <p className="mt-3 text-white/70">
          Join the mission to raise <b>$30,000,000</b>. 
          Fair tiered pricing, locked liquidity, and direct airdrops.
        </p>

        <div className="mt-6 rounded-xl bg-slate-900/60 border border-white/10 p-6">
          <div className="flex justify-between text-xs text-white/60">
            <span>Raised</span>
            <span>{raisedSOL.toLocaleString()} / {HARD_CAP.toLocaleString()} SOL</span>
          </div>
          <div className="mt-2 h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs">{percent.toFixed(2)}%</div>

          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">Amount (SOL)</label>
                <input
                  type="number"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2"
                />
                <div className="mt-2 text-sm">
                  You’ll receive ~{" "}
                  <span className="font-semibold">
                    {estQuote.totalTokens.toLocaleString()}
                  </span>{" "}
                  MSHP
                </div>
              </div>
              <button
                onClick={handleContribute}
                className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-4 py-2 font-semibold"
              >
                Contribute
              </button>
            </div>
          ) : (
            <div className="mt-4 text-emerald-400 font-semibold">
              Presale Sold Out 🚀
            </div>
          )}
        </div>
      </section>

      {/* Tokenomics */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold">Tokenomics</h2>
        <p className="text-white/70 mt-2">Transparent distribution of 1.5B MSHP tokens</p>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <TokenCard title="Presale" percent={40} desc="600,000,000 MSHP" />
          <TokenCard title="Liquidity" percent={30} desc="450,000,000 MSHP (locked)" />
          <TokenCard title="Community/Rewards" percent={15} desc="225,000,000 MSHP" />
          <TokenCard title="Team" percent={10} desc="150,000,000 MSHP" />
          <TokenCard title="Marketing" percent={5} desc="75,000,000 MSHP" />
        </div>
      </section>

      {/* Roadmap */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold">Roadmap</h2>
        <div className="mt-8 grid md:grid-cols-4 gap-6">
          <RoadItem phase="Q4 2025" title="Presale & Community" points={["Raise $30M", "Grow Telegram & Twitter", "Launch campaigns"]} />
          <RoadItem phase="Q1 2026" title="DEX Listing" points={["Raydium listing", "Airdrop distribution", "Liquidity locked"]} />
          <RoadItem phase="Q2 2026" title="Utility Rollout" points={["Staking", "Partnerships", "NFT integrations"]} />
          <RoadItem phase="Q3 2026" title="Expansion" points={["CEX listings", "Mobile wallet perks", "Global marketing"]} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold">FAQ</h2>
        <FAQ q="How much are you raising?" a="Target raise is $30,000,000 in SOL/USDC." />
        <FAQ q="How do I receive tokens?" a="All tokens are airdropped automatically to your connected wallet after presale ends." />
        <FAQ q="Is liquidity locked?" a="Yes — 60% of raised funds are paired with MSHP on Raydium and LP is locked." />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-white/60">
        © {new Date().getFullYear()} MoonShip. All rights reserved.
      </footer>
    </div>
  );
}

// =============================================================
// Helpers
// =============================================================
function generateLinearTiers({ tiers, startPrice, endPrice, totalCapSOL }) {
  const out = [];
  const step = tiers > 1 ? (endPrice - startPrice) / (tiers - 1) : 0;
  const perTierCap = Math.round((totalCapSOL / tiers) * 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < tiers; i++) {
    const price = Math.round(startPrice + step * i);
    cumulative = Math.round((cumulative + perTierCap) * 100) / 100;
    out.push({ pricePerSOL: price, capSOL: perTierCap, cumulativeSOL: cumulative });
  }
  return out;
}

function getTierState(currentRaisedSOL, tiers) {
  let acc = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const tierEnd = acc + t.capSOL;
    if (currentRaisedSOL < tierEnd) {
      return { currentTierIndex: i, tierRemainingSOL: tierEnd - currentRaisedSOL, currentPrice: t.pricePerSOL };
    }
    acc = tierEnd;
  }
  const last = tiers[tiers.length - 1];
  return { currentTierIndex: tiers.length - 1, tierRemainingSOL: 0, currentPrice: last.pricePerSOL };
}

function quoteTokensForContribution(currentRaisedSOL, amountSOL, tiers) {
  let remaining = Math.max(0, amountSOL);
  let accRaised = currentRaisedSOL;
  let totalTokens = 0;
  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const t = tiers[i];
    const tierEnd = tiers.slice(0, i + 1).reduce((a, x) => a + x.capSOL, 0);
    if (accRaised >= tierEnd) continue;
    const room = tierEnd - accRaised;
    const take = Math.min(room, remaining);
    totalTokens += take * t.pricePerSOL;
    remaining -= take;
    accRaised += take;
  }
  return { totalTokens };
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

// Small UI components
function TokenCard({ title, percent, desc }) {
  return (
    <div className="rounded-3xl border border-white/10 p-6 bg-slate-900/60">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-white/70 text-sm">{percent}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm text-white/70">{desc}</p>
    </div>
  );
}

function RoadItem({ phase, title, points }) {
  return (
    <div className="rounded-3xl border border-white/10 p-6 bg-slate-900/60">
      <div className="text-xs text-white/60">{phase}</div>
      <div className="font-semibold mt-1">{title}</div>
      <ul className="mt-3 list-disc list-inside text-white/70 text-sm space-y-1">
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 my-2">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-4 py-3 flex justify-between">
        <span>{q}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4 text-sm text-white/70">{a}</div>}
    </div>
  );
}

