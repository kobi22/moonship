import React, { useMemo, useState, useRef, useEffect } from "react";
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
const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_000_000_000,
  },
  presale: {
    hardCapUSD: 30_000_000,
    softCapUSD: 500_000,
    initialRaisedUSD: 12_874_500,
    batchPrice: 0.05, // Ends at $0.05
    accepted: ["USDC", "SOL"],
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
  },
};

// ----------------------------------------
// Wallet Wrapper
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
          <MoonShipInner />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// ----------------------------------------
// UI
// ----------------------------------------
function MoonShipInner() {
  const { connected, publicKey } = useWallet();

  const [raisedUSD, setRaisedUSD] = useState(CONFIG.presale.initialRaisedUSD);
  const [contribution, setContribution] = useState(1000); // default in USD
  const [userTokens, setUserTokens] = useState(0);

  const percent = Math.min(
    100,
    (raisedUSD / CONFIG.presale.hardCapUSD) * 100
  );
  const soldOut = raisedUSD >= CONFIG.presale.hardCapUSD;

  // Starfield Background
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const stars = Array.from({ length: 100 }, () => ({
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

  // Handle Contribution
  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = Number(contribution);
    if (!isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, CONFIG.presale.hardCapUSD - raisedUSD);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    setRaisedUSD((x) => x + delta);
    setUserTokens((t) => t + Math.floor(delta / CONFIG.presale.batchPrice));
  }

  return (
    <div className="relative min-h-screen text-white font-sans overflow-hidden">
      {/* Background */}
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold text-xl tracking-wide">🚀 MoonShip</h1>
          <div className="flex items-center gap-4">
            <a
              href={CONFIG.socials.twitter}
              target="_blank"
              className="hover:text-sky-400"
            >
              Twitter
            </a>
            <a
              href={CONFIG.socials.telegram}
              target="_blank"
              className="hover:text-sky-400"
            >
              Telegram
            </a>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 text-white px-4 py-2 rounded-md" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-5xl font-extrabold font-[Orbitron] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
          Join the MoonShip Presale
        </h2>
        <p className="mt-4 text-lg text-gray-300">
          Invest early. Tiered pricing. Liquidity locked. Tokens airdropped
          automatically.
        </p>
      </section>

      {/* Presale Card */}
      <section className="max-w-2xl mx-auto px-6">
        <div className="bg-black/60 border border-white/10 rounded-xl shadow-lg p-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Raised</span>
            <span>
              ${raisedUSD.toLocaleString()} / $
              {CONFIG.presale.hardCapUSD.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm font-medium text-gray-300">
            {percent.toFixed(1)}%
          </div>

          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2 text-left">
                <label className="text-sm text-gray-400">Amount (USD)</label>
                <input
                  type="number"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-2 text-sm">
                  You’ll receive ~{" "}
                  <span className="font-semibold text-sky-300">
                    {userTokens.toLocaleString()}
                  </span>{" "}
                  MSHP
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
      <footer className="mt-16 border-t border-white/10 py-8 text-center text-sm text-gray-400">
        Presale ends at{" "}
        <span className="font-semibold text-sky-400">$0.05</span> per MSHP.
      </footer>
    </div>
  );
}
