import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
    initialRaisedUSD: 1_287_450, // demo start
    batchPrice: 0.05, // presale ends here
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
  },
};

export default function MoonShipPresale() {
  const [raisedUSD, setRaisedUSD] = useState(CONFIG.presale.initialRaisedUSD);
  const [contribution, setContribution] = useState(1000);
  const [userAllocation, setUserAllocation] = useState(0);

  const percent = Math.min(
    100,
    (raisedUSD / CONFIG.presale.hardCapUSD) * 100
  );
  const soldOut = raisedUSD >= CONFIG.presale.hardCapUSD;

  function handleContribute() {
    if (contribution <= 0) return alert("Enter a valid amount");
    if (soldOut) return alert("Presale already ended");

    const newRaised = raisedUSD + contribution;
    setRaisedUSD(newRaised);
    setUserAllocation(
      userAllocation + Math.floor(contribution / CONFIG.presale.batchPrice)
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <h1 className="text-xl font-bold">🚀 MoonShip</h1>
          <div className="flex items-center gap-4">
            <a href={CONFIG.socials.twitter} target="_blank" rel="noreferrer">
              Twitter
            </a>
            <a href={CONFIG.socials.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 text-white px-3 py-1 rounded-md" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
          Join the MoonShip Presale
        </h2>
        <p className="mt-4 text-white/70">
          Raising <b>${CONFIG.presale.hardCapUSD.toLocaleString()}</b>. Ends at{" "}
          <b>${CONFIG.presale.batchPrice.toFixed(2)}</b> per MSHP. Tokens airdropped automatically.
        </p>
      </section>

      {/* Progress */}
      <section className="max-w-2xl mx-auto px-6">
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between text-sm text-white/60 mb-2">
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
          <div className="mt-2 text-right text-xs">{percent.toFixed(1)}%</div>

          {/* Contribution */}
          {!soldOut ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 text-left">
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
                    {Math.floor(contribution / CONFIG.presale.batchPrice).toLocaleString()}
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
      <footer className="mt-16 border-t border-white/10 py-6 text-center text-sm text-white/60">
        Presale ends at <span className="text-white font-semibold">$0.05</span> per MSHP.
      </footer>
    </div>
  );
}

