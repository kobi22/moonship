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
import { motion } from "framer-motion";
import "@solana/wallet-adapter-react-ui/styles.css";

// =============================================================
// CONFIG
// =============================================================
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
    batchPrice: 0.05, // presale ends at $0.05
    accepted: ["USDC", "SOL"],
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
  const [raisedUSD, setRaisedUSD] = useState(CONFIG.presale.initialRaisedUSD);
  const [contribution, setContribution] = useState(1000); // default in USD
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  const percent = Math.min(
    100,
    (raisedUSD / CONFIG.presale.hardCapUSD) * 100
  );
  const soldOut = raisedUSD >= CONFIG.presale.hardCapUSD;

  // Starfield background
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

  function handleContribute() {
    if (!connected || !publicKey) return alert("Connect your wallet first.");
    const add = Number(contribution);
    if (!isFinite(add) || add <= 0) return;
    const remaining = Math.max(0, CONFIG.presale.hardCapUSD - raisedUSD);
    const delta = Math.min(add, remaining);
    if (delta <= 0) return alert("Presale hard cap reached.");
    setRaisedUSD((x) => x + delta);
    setUserAllocationTokens(
      (t) => t + Math.floor(delta / CONFIG.presale.batchPrice)
    );
  }

  return (
    <div className="relative min-h-screen text-white bg-black overflow-hidden">
      {/* Starfield */}
      <canvas ref={canvasRef} className="fixed inset-0 -z-10" />

      {/* Astronaut */}
      <motion.img
        src="/astronaut-nasa.png"
        alt="Astronaut"
        className="absolute bottom-10 right-10 w-44 md:w-56"
        initial={{ x: "120%", opacity: 0 }}
        animate={{
          x: ["120%", "0%", "0%", "120%"],
          rotate: [0, 10, -10, 0],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 6,
          ease: "easeInOut",
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-lg">
            🚀 MoonShip
          </div>
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

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
          MoonShip Presale
        </h2>
        <p className="mt-4 text-white/70">
          Raising <b>${CONFIG.presale.hardCapUSD.toLocaleString()}</b> with fair
          launch mechanics. Ends when price reaches{" "}
          <b>${CONFIG.presale.batchPrice.toFixed(2)}</b>.
        </p>
      </section>

      {/* Presale Card */}
      <section className="max-w-2xl mx-auto px-6">
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between text-xs text-white/60">
            <span>Raised</span>
            <span>
              ${raisedUSD.toLocaleString()} / $
              {CONFIG.presale.hardCapUSD.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs">{percent.toFixed(1)}%</div>

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
                    {userAllocationTokens.toLocaleString()}
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

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-white/60">
        Presale ends at{" "}
        <span className="font-semibold text-indigo-400">
          ${CONFIG.presale.batchPrice.toFixed(2)}
        </span>{" "}
        per MSHP.
      </footer>
    </div>
  );
}
