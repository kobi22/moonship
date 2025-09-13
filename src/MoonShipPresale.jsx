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
// CONFIG (USD batches)
// =============================================================
const DEFAULT_BATCHES = generateLinearBatches({
  batches: 30,
  startPrice: 0.05, // Launch price
  endPrice: 0.20,   // Final price
  totalCapUSD: 30_000_000, // Raise target
});

const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_000_000_000,
  },
  presale: {
    hardCapUSD: DEFAULT_BATCHES.reduce((a, b) => a + b.capUSD, 0),
    softCapUSD: 5_000_000,
    liquidityPercent: 60,
    accepted: ["USDC"],
    initialRaisedUSD: 12_870_000,
    batches: DEFAULT_BATCHES,
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
  const BATCHES = CONFIG.presale.batches;
  const HARD_CAP = CONFIG.presale.hardCapUSD;

  const [raisedUSD, setRaisedUSD] = useState(CONFIG.presale.initialRaisedUSD);
  const [contribution, setContribution] = useState(1000); // default $1000
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  // Simple static background
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#030014";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Batch state + quote
  const { currentBatchIndex, batchRemainingUSD, currentPrice } =
    getBatchState(raisedUSD, BATCHES);
  const estQuote = quoteTokensForContribution(
    raisedUSD,
    safeNum(contribution),
    BATCHES
  );

  const percent = Math.min(100, (raisedUSD / HARD_CAP) * 100);
  const soldOut = raisedUSD >= HARD_CAP;

  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = safeNum(contribution);
    if (!isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, HARD_CAP - raisedUSD);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    const q = quoteTokensForContribution(raisedUSD, delta, BATCHES);
    setRaisedUSD((x) => +(x + delta).toFixed(2));
    setUserAllocationTokens((t) => +(t + q.totalTokens).toFixed(0));
  }

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background */}
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
          Join the mission. Batch-based pricing. Locked liquidity. Airdropped tokens.
        </p>

        {/* Highlight Launch Price */}
        <div className="mt-4 rounded-lg border-2 border-emerald-400 bg-emerald-900/40 p-4 text-center shadow-lg">
          <span className="text-xl font-bold text-emerald-300">
            🚀 Launch Price: $0.05 per MSHP
          </span>
          <div className="text-xs text-white/60 mt-1">
            Final batch closes at $0.20
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6 rounded-xl bg-slate-900/60 border border-white/10 p-6">
          <div className="flex justify-between text-xs text-white/60">
            <span>Raised</span>
            <span>
              ${raisedUSD.toLocaleString()} / ${HARD_CAP.toLocaleString()} USD
            </span>
          </div>
          <div className="mt-2 h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs">{percent.toFixed(1)}%</div>

          {/* Batch Info */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 text-center">
              <div className="text-white/60">Current Batch</div>
              <div className="font-semibold text-indigo-400">
                {currentBatchIndex + 1} / {BATCHES.length}
              </div>
              <div className="text-xs text-white/50">
                Price: ${currentPrice.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 text-center">
              <div className="text-white/60">Next Batch</div>
              <div className="font-semibold text-emerald-400">
                {currentBatchIndex + 2 > BATCHES.length
                  ? "—"
                  : `$${BATCHES[currentBatchIndex + 1].pricePerMSHP.toFixed(2)}`}
              </div>
              <div className="text-xs text-white/50">
                {currentBatchIndex + 2 > BATCHES.length
                  ? "Final batch reached"
                  : "Price per MSHP"}
              </div>
            </div>
          </div>

          {/* Contribute */}
          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-white/60">Amount (USD)</label>
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
    </div>
  );
}

// =============================================================
// Helpers
// =============================================================
function generateLinearBatches({ batches, startPrice, endPrice, totalCapUSD }) {
  const out = [];
  const step = batches > 1 ? (endPrice - startPrice) / (batches - 1) : 0;
  const perBatchCap = Math.round((totalCapUSD / batches) * 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < batches; i++) {
    const price = +(startPrice + step * i).toFixed(4);
    cumulative = Math.round((cumulative + perBatchCap) * 100) / 100;
    out.push({ pricePerMSHP: price, capUSD: perBatchCap, cumulativeUSD: cumulative });
  }
  return out;
}

function getBatchState(currentRaisedUSD, batches) {
  let acc = 0;
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    const batchEnd = acc + b.capUSD;
    if (currentRaisedUSD < batchEnd) {
      return {
        currentBatchIndex: i,
        batchRemainingUSD: batchEnd - currentRaisedUSD,
        currentPrice: b.pricePerMSHP,
      };
    }
    acc = batchEnd;
  }
  const last = batches[batches.length - 1];
  return { currentBatchIndex: batches.length - 1, batchRemainingUSD: 0, currentPrice: last.pricePerMSHP };
}

function quoteTokensForContribution(currentRaisedUSD, amountUSD, batches) {
  let remaining = Math.max(0, amountUSD);
  let accRaised = currentRaisedUSD;
  let totalTokens = 0;
  for (let i = 0; i < batches.length && remaining > 0; i++) {
    const b = batches[i];
    const batchEnd = batches.slice(0, i + 1).reduce((a, x) => a + x.capUSD, 0);
    if (accRaised >= batchEnd) continue;
    const room = batchEnd - accRaised;
    const take = Math.min(room, remaining);
    totalTokens += take / b.pricePerMSHP;
    remaining -= take;
    accRaised += take;
  }
  return { totalTokens };
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}
