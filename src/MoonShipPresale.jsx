import React, { useMemo, useState } from "react";
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

// ----------------------------------------
// CONFIG
// ----------------------------------------
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 120_000,
  endPrice: 80_000,
  totalCapSOL: 3000,
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
    initialRaisedSOL: 1287.45,
    tiers: DEFAULT_TIERS,
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.shop",
  },
};

// ----------------------------------------
// Wrapper
// ----------------------------------------
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
          <MainPage />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// ----------------------------------------
// Main Page UI
// ----------------------------------------
function MainPage() {
  const TIERS = CONFIG.presale.tiers;
  const HARD_CAP = CONFIG.presale.hardCapSOL;

  const [raisedSOL, setRaisedSOL] = useState(CONFIG.presale.initialRaisedSOL);
  const [contribution, setContribution] = useState(1);
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  const { currentPrice } = getTierState(raisedSOL, TIERS);
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-lg font-bold">🚀 MoonShip</h1>
          <div className="flex items-center gap-4">
            <a href={CONFIG.socials.twitter} target="_blank" className="text-sm text-gray-600 hover:text-black">Twitter</a>
            <a href={CONFIG.socials.telegram} target="_blank" className="text-sm text-gray-600 hover:text-black">Telegram</a>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 text-white px-4 py-2 rounded-md" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-4xl font-extrabold tracking-tight">Join the MoonShip Presale</h2>
        <p className="mt-3 text-lg text-gray-600">
          Invest early. Tiered pricing. Liquidity locked. Tokens airdropped automatically.
        </p>
      </section>

      {/* Presale Card */}
      <section className="max-w-2xl mx-auto px-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Raised</span>
            <span>{raisedSOL.toLocaleString()} / {HARD_CAP} USD</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-3 bg-indigo-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm font-medium text-gray-700">{percent.toFixed(1)}%</div>

          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <label className="text-sm text-gray-600">Amount (USD)</label>
                <input
                  type="number"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-2 text-sm text-gray-700">
                  You’ll receive ~{" "}
                  <span className="font-semibold">
                    {estQuote.totalTokens.toLocaleString()}
                  </span>{" "}
                  MSHP (Batch price: ${currentPrice / 1000})
                </div>
              </div>
              <button
                onClick={handleContribute}
                className="rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-semibold"
              >
                Contribute
              </button>
            </div>
          ) : (
            <div className="mt-4 text-green-600 font-semibold">
              Presale Sold Out 🚀
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          Presale ends at <span className="font-semibold text-indigo-600">$0.05</span> per MSHP.
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------
// Helpers
// ----------------------------------------
function generateLinearTiers({ tiers, startPrice, endPrice, totalCapSOL }) {
  const out = [];
  const step = tiers > 1 ? (endPrice - startPrice) / (tiers - 1) : 0;
  const perTierCap = Math.round((totalCapSOL / tiers) * 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < tiers; i++) {
    const price = Math.round(startPrice + step * i);
    cumulative = Math.round((cumulative + perTierCap) * 100) / 100;
    out.push({
      pricePerSOL: price,
      capSOL: perTierCap,
      cumulativeSOL: cumulative,
    });
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
