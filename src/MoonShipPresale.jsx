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
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 6,
    totalSupply: 1000000000,
  },
  presale: {
    hardCapUSDC: DEFAULT_TIERS.reduce((a, t) => a + t.capUSDC, 0),
    softCapUSDC: 500,
    initialRaisedUSDC: 1287.45,
    tiers: DEFAULT_TIERS,
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
  },
};

// ===== Format helper =====
function formatUSDC(n) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ===== Top-level providers =====
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
  const HARD_CAP = CONFIG.presale.hardCapUSDC;
  const [raisedUSDC, setRaisedUSDC] = useState(CONFIG.presale.initialRaisedUSDC);

  // store contribution as number + a formatted string for input display
  const [contribution, setContribution] = useState(1);
  const [contributionDisplay, setContributionDisplay] = useState(formatUSDC(1));

  const [userAllocationTokens, setUserAllocationTokens] = useState(0);
  const { connected, publicKey } = useWallet();

  // Background
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

  // Presale logic
  const { currentTierIndex, tierRemainingUSDC, currentPrice } = getTierState(
    raisedUSDC,
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

  // handle input with $ formatting
  function handleContributionChange(e) {
    const raw = e.target.value.replace(/[^0-9.]/g, ""); // strip $
    const num = parseFloat(raw) || 0;
    setContribution(num);
    setContributionDisplay(formatUSDC(num));
  }

  function handleContributionBlur() {
    setContributionDisplay(formatUSDC(contribution)); // ensure formatting on blur
  }

  return (
    <div className="relative min-h-screen text-white">
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold">🚀 MoonShip</div>
          <div className="flex items-center gap-3">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">
              X
            </a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">
              TG
            </a>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* Presale */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-extrabold">MoonShip Presale</h1>
        <p className="mt-2 text-white/70">
          Minimal, clean presale. Tiered pricing. Liquidity locked. Airdropped tokens.
        </p>

        <div className="mt-6 rounded-xl bg-slate-900/60 border border-white/10 p-6">
          <div className="flex justify-between text-xs text-white/60">
            <span>Raised</span>
            <span>
              {formatUSDC(raisedUSDC)} / {formatUSDC(HARD_CAP)} USDC
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
                  You’ll receive ~{" "}
                  <span className="text-white">
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
