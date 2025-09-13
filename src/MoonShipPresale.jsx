// =============================================================
// CONFIG (USD-based batches)
// =============================================================
const DEFAULT_BATCHES = generateLinearBatches({
  batches: 30,
  startPrice: 0.05,   // $0.05 launch
  endPrice: 0.20,     // $0.20 final
  totalCapUSD: 30_000_000, // raising $30M
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
    accepted: ["USDC"], // USD-based
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
// Batches generator
// =============================================================
function generateLinearBatches({ batches, startPrice, endPrice, totalCapUSD }) {
  const out = [];
  const step = batches > 1 ? (endPrice - startPrice) / (batches - 1) : 0;
  const perBatchCap = Math.round((totalCapUSD / batches) * 100) / 100;
  let cumulative = 0;
  for (let i = 0; i < batches; i++) {
    const price = +(startPrice + step * i).toFixed(4);
    cumulative = Math.round((cumulative + perBatchCap) * 100) / 100;
    out.push({
      pricePerMSHP: price,
      capUSD: perBatchCap,
      cumulativeUSD: cumulative,
    });
  }
  return out;
}

// =============================================================
// Batch state + quote
// =============================================================
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
  return {
    currentBatchIndex: batches.length - 1,
    batchRemainingUSD: 0,
    currentPrice: last.pricePerMSHP,
  };
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

// =============================================================
// UI snippet for presale
// =============================================================
<section className="mx-auto max-w-4xl px-4 py-12">
  <h1 className="text-4xl font-extrabold">MoonShip Presale</h1>
  <p className="mt-2 text-white/70">
    Secure your allocation. <b>Batch-based pricing</b> increases from{" "}
    <span className="text-emerald-400">$0.05</span> to{" "}
    <span className="text-red-400">$0.20</span>.
  </p>

  {/* Highlight Launch Price */}
  <div className="mt-4 rounded-lg border-2 border-emerald-400 bg-emerald-900/40 p-4 text-center shadow-lg">
    <span className="text-xl font-bold text-emerald-300">
      🚀 Launch Price: $0.05 per MSHP
    </span>
    <div className="text-xs text-white/60 mt-1">
      Final batch will close at $0.20
    </div>
  </div>

  {/* Raised */}
  <div className="mt-6 rounded-xl bg-slate-900/60 border border-white/10 p-6">
    <div className="flex justify-between text-xs text-white/60">
      <span>Raised</span>
      <span>
        ${raisedUSD.toLocaleString()} / $
        {CONFIG.presale.hardCapUSD.toLocaleString()} USD
      </span>
    </div>
    <div className="mt-2 h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-3 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400"
        style={{ width: `${percent}%` }}
      />
    </div>
    <div className="mt-1 text-right text-xs">{percent.toFixed(1)}%</div>

    {/* Current & Next Batch */}
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 text-center">
        <div className="text-white/60">Current Batch</div>
        <div className="font-semibold text-indigo-400">
          {currentBatchIndex + 1} / {CONFIG.presale.batches.length}
        </div>
        <div className="text-xs text-white/50">
          Price: ${currentPrice.toFixed(2)}
        </div>
      </div>
      <div className="p-3 rounded-lg bg-slate-800/60 border border-white/10 text-center">
        <div className="text-white/60">Next Batch</div>
        <div className="font-semibold text-emerald-400">
          {currentBatchIndex + 2 > CONFIG.presale.batches.length
            ? "—"
            : `$${CONFIG.presale.batches[currentBatchIndex + 1].pricePerMSHP.toFixed(2)}`}
        </div>
        <div className="text-xs text-white/50">
          {currentBatchIndex + 2 > CONFIG.presale.batches.length
            ? "Final batch reached"
            : "Price per MSHP"}
        </div>
      </div>
    </div>
  </div>
</section>
