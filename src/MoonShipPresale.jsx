import React, { useMemo, useState, useEffect, useRef } from "react";
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
  TorusWalletAdapter,
  GlowWalletAdapter,
  ExodusWalletAdapter,
  BraveWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

// ===== Mock config =====
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 120000,
  endPrice: 80000,
  totalCapUSDC: 3000,
});

const CONFIG = {
  token: { name: "MoonShip", symbol: "MSHP", decimals: 9, totalSupply: 1_000_000_000 },
  presale: {
    hardCapUSDC: DEFAULT_TIERS.reduce((a, t) => a + t.capUSDC, 0),
    softCapUSDC: 500,
    initialRaisedUSDC: 1287.45,
    tiers: DEFAULT_TIERS,
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.shop",
  },
};

// ===== Format helper =====
function formatUSDC(n) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ===== Top-level providers (adds wallets to the connect button modal) =====
export default function MoonShipPresale() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = clusterApiUrl(network);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
      new GlowWalletAdapter(),
      new ExodusWalletAdapter(),
      new BraveWalletAdapter(),
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

// ===== Main Presale UI =====
function MoonShipInner() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapSOL;
  const [raisedSOL, setRaisedSOL] = useState(CONFIG.presale.initialRaisedSOL);
  const [contribution, setContribution] = useState(1);
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  // Simple static background
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2,
    }));

    function draw() {
      ctx.fillStyle = "#030014";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "white";
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
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
    raisedUSDC,
    safeNum(contribution),
    TIERS
  );

  const percent = Math.min(100, (raisedUSDC / HARD_CAP) * 100);
  const soldOut = raisedUSDC >= HARD_CAP;

  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = safeNum(contribution);
    if (!Number.isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, HARD_CAP - raisedUSDC);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    const q = quoteTokensForContribution(raisedUSDC, delta, TIERS);
    setRaisedUSDC((x) => +(x + delta).toFixed(2));
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
            🚀 MoonShip
          </div>
          <div className="flex items-center gap-4">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">
              Twitter
            </a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-4xl font-extrabold tracking-tight">
          Join the MoonShip Presale
        </h2>
        <p className="mt-3 text-lg text-gray-300">
          Raising <b>{formatUSDC(HARD_CAP)}</b> — Current price:{" "}
          <b>{currentPrice.toLocaleString()} MSHP/USDC</b>.
        </p>
      </section>

      {/* Presale Card */}
      <section className="max-w-xl mx-auto px-6">
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between text-xs text-white/60 mb-2">
            <span>Raised</span>
            <span>{raisedSOL.toLocaleString()} / {HARD_CAP} SOL</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 text-right text-[11px] text-white/60">{percent.toFixed(1)}%</div>

          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">Amount (USDC)</label>
                <input
                  type="text"
                  value={contributionDisplay}
                  onChange={handleContributionChange}
                  onBlur={handleContributionBlur}
                  className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2"
                />
                <div className="mt-2 text-[12px] text-white/60">
                  You’ll receive ~ <span className="text-white">{estQuote.totalTokens.toLocaleString()}</span> MSHP
                </div>
              </div>
              <button
                onClick={handleContribute}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-semibold"
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

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-white/50 pb-8">
        Presale price progression across <b>{TIERS.length}</b> tiers.
      </footer>
    </div>
  );
}

/* ================= Helpers ================= */
function generateLinearTiers({ tiers, startPrice, endPrice, totalCapUSDC }) {
  const out = [];
  const step = tiers > 1 ? (endPrice - startPrice) / (tiers - 1) : 0;
  const perTierCap = Math.round((totalCapUSDC / tiers) * 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < tiers; i++) {
    const price = Math.round(startPrice + step * i);
    cumulative = Math.round((cumulative + perTierCap) * 100) / 100;
    out.push({
      pricePerUSDC: price,
      capUSDC: perTierCap,
      cumulativeUSDC: cumulative,
    });
  }
  return out;
}

function getTierState(currentRaisedUSDC, tiers) {
  let acc = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const tierEnd = acc + t.capUSDC;
    if (currentRaisedUSDC < tierEnd) {
      return {
        currentTierIndex: i,
        tierRemainingUSDC: tierEnd - currentRaisedUSDC,
        currentPrice: t.pricePerUSDC,
      };
    }
    acc = tierEnd;
  }
  const last = tiers[tiers.length - 1];
  return {
    currentTierIndex: tiers.length - 1,
    tierRemainingUSDC: 0,
    currentPrice: last.pricePerUSDC,
  };
}

function quoteTokensForContribution(currentRaisedUSDC, amountUSDC, tiers) {
  let remaining = Math.max(0, amountUSDC);
  let accRaised = currentRaisedUSDC;
  let totalTokens = 0;
  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const t = tiers[i];
    const tierEnd = tiers.slice(0, i + 1).reduce((a, x) => a + x.capUSDC, 0);
    if (accRaised >= tierEnd) continue;
    const room = tierEnd - accRaised;
    const take = Math.min(room, remaining);
    totalTokens += take * t.pricePerUSDC;
    remaining -= take;
    accRaised += take;
  }
  return { totalTokens };
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}
