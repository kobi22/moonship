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
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

/* ===== Mock config ===== */
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 0.01, // start at $0.01 per token
  endPrice: 0.05,   // final price = $0.05 per token
  totalCapUSDC: 15_000_000, // 15 million raise target
});

const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_000_000_000,
  },
  presale: {
    hardCapUSDC: 15_000_000,
    softCapUSDC: 500_000,
    initialRaisedUSDC: 0, // mock starting raised amount
    tiers: DEFAULT_TIERS,
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.shop",
  },
};

/* ===== Helpers ===== */
function formatUSDC(n) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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

/* ===== Main UI ===== */
function MoonShipInner() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapUSDC;
  const [raisedUSDC, setRaisedUSDC] = useState(CONFIG.presale.initialRaisedUSDC);
  const [contribution, setContribution] = useState(1000); // default mock
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  // Background starfield
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

  // Presale logic
  const { currentPrice } = getTierState(raisedUSDC, TIERS);
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
      <canvas ref={canvasRef} className="fixed inset-0 -z-40" />

      {/* NAVBAR */}
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/40 border-b border-indigo-500/20">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            🚀 MoonShip
          </div>
          <div className="flex items-center gap-6">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">
              Twitter
            </a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <WalletMultiButton className="!bg-indigo-600 !hover:bg-indigo-700 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-3xl mx-auto text-center py-20 px-6">
        <h1 className="text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            MoonShip Presale
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Raising <b>{formatUSDC(HARD_CAP)}</b> <br />
          Final price per token: <b>$0.05</b>
        </p>
      </section>

      {/* PRESALE CARD */}
      <section className="relative z-10 max-w-xl mx-auto px-6">
        <div className="bg-slate-900/70 backdrop-blur border border-indigo-500/20 rounded-2xl p-8 shadow-lg">
          <div className="flex justify-between text-xs text-white/60 mb-2">
            <span>Raised</span>
            <span>
              {formatUSDC(raisedUSDC)} / {formatUSDC(HARD_CAP)}
            </span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[11px] text-white/60">
            {percent.toFixed(1)}%
          </div>

          {!soldOut ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">Amount (USDC)</label>
                <input
                  type="number"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg bg-slate-800/70 px-3 py-2 
                             border border-indigo-500/30 focus:outline-none 
                             focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-3 text-[12px] text-white/60">
                  You’ll receive ~{" "}
                  <span className="text-white font-semibold">
                    {estQuote.totalTokens.toLocaleString()}
                  </span>{" "}
                  MSHP
                </div>
              </div>
              <button
                onClick={handleContribute}
                className="rounded-xl px-6 py-3 font-semibold text-lg 
                           bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
                           hover:scale-105 transition-all duration-300"
              >
                Contribute
              </button>
            </div>
          ) : (
            <div className="mt-4 text-emerald-400 font-semibold text-center">
              Presale Sold Out 🚀
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ===== Helpers ===== */
function generateLinearTiers({ tiers, startPrice, endPrice, totalCapUSDC }) {
  const out = [];
  const step = tiers > 1 ? (endPrice - startPrice) / (tiers - 1) : 0;
  const perTierCap = totalCapUSDC / tiers;
  let cumulative = 0;
  for (let i = 0; i < tiers; i++) {
    const price = +(startPrice + step * i).toFixed(4);
    cumulative = +(cumulative + perTierCap).toFixed(2);
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
  return { currentTierIndex: tiers.length - 1, tierRemainingUSDC: 0, currentPrice: last.pricePerUSDC };
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
    totalTokens += take / (t.pricePerUSDC || 1);
    remaining -= take;
    accRaised += take;
  }
  return { totalTokens };
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}
