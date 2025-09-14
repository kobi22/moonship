// src/MoonShipPresale.jsx
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

// ===== Mock config (kept simple/minimal) =====
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 120_000,
  endPrice: 80_000,
  totalCapSOL: 3000,
});

const CONFIG = {
  token: { name: "MoonShip", symbol: "MSHP", decimals: 9, totalSupply: 1_000_000_000 },
  presale: {
    hardCapSOL: DEFAULT_TIERS.reduce((a, t) => a + t.capSOL, 0),
    softCapSOL: 500,
    initialRaisedSOL: 1287.45,
    tiers: DEFAULT_TIERS,
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
  },
};

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

// ===== Minimal clean UI with WalletMultiButton =====
function MoonShipInner() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapSOL;
  const [raisedSOL, setRaisedSOL] = useState(CONFIG.presale.initialRaisedSOL);
  const [contribution, setContribution] = useState(1);
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);
  const { connected, publicKey } = useWallet();

  // Background (solid color)
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const { currentPrice } = getTierState(raisedSOL, TIERS);
  const estQuote = quoteTokensForContribution(raisedSOL, safeNum(contribution), TIERS);
  const percent = Math.min(100, (raisedSOL / HARD_CAP) * 100);
  const soldOut = raisedSOL >= HARD_CAP;

  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = safeNum(contribution);
    if (!Number.isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, HARD_CAP - raisedSOL);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    const q = quoteTokensForContribution(raisedSOL, delta, TIERS);
    setRaisedSOL((x) => +(x + delta).toFixed(2));
    setUserAllocationTokens((t) => +(t + q.totalTokens).toFixed(0));
  }

  return (
    <div className="relative min-h-screen text-white">
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/40 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">🚀 MoonShip</span>
            <span className="text-white/60 text-sm">$MSHP</span>
          </div>
          <div className="flex items-center gap-4">
            <a className="text-white/70 hover:text-white text-sm" href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">Twitter</a>
            <a className="text-white/70 hover:text-white text-sm" href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">Telegram</a>

            {/* The button below opens the modal with the wallets we registered above */}
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-xl !px-4 !py-2 !text-sm !font-semibold" />

            {/* Helper text to show which wallets are available */}
            <div className="hidden md:block text-xs text-white/60">
              Supported: Phantom · Solflare · Coinbase · Ledger
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-extrabold tracking-tight">MoonShip Presale</h1>
        <p className="mt-2 text-white/70">
          Minimal, clean presale. Tiered pricing. Liquidity locked. Airdropped tokens.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
          <div className="flex justify-between text-xs text-white/60">
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
                <label className="text-xs text-white/60">Amount (SOL)</label>
                <input
                  type="number"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-400/50"
                  placeholder="1.0"
                />
                <div className="mt-2 text-[12px] text-white/60">
                  You’ll receive ~ <span className="text-white">{estQuote.totalTokens.toLocaleString()}</span> MSHP
                </div>
              </div>
              <button
                onClick={handleContribute}
                className="w-full rounded-xl px-4 py-3 font-semibold bg-indigo-600 hover:bg-indigo-700 shadow"
              >
                Contribute
              </button>
            </div>
          ) : (
            <div className="mt-4 text-emerald-400 font-semibold">Presale Sold Out 🚀</div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ================= Helpers (unchanged, minimal) ================= */
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
      return {
        currentTierIndex: i,
        tierRemainingSOL: tierEnd - currentRaisedSOL,
        currentPrice: t.pricePerSOL,
      };
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
