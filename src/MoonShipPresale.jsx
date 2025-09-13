function MoonShipInner() {
  const [raisedUSD, setRaisedUSD] = useState(CONFIG.presale.initialRaisedUSD);
  const [contribution, setContribution] = useState(1000); // default in USD
  const [userAllocationTokens, setUserAllocationTokens] = useState(0);

  const { connected, publicKey } = useWallet();

  // Batch calculations
  const totalBatches = Math.ceil(
    CONFIG.presale.hardCapUSD / (CONFIG.presale.hardCapUSD / 30) // 30 batches default
  );
  const batchSizeUSD = CONFIG.presale.hardCapUSD / totalBatches;
  const currentBatch = Math.min(
    totalBatches,
    Math.floor(raisedUSD / batchSizeUSD) + 1
  );

  const percent = Math.min(
    100,
    (raisedUSD / CONFIG.presale.hardCapUSD) * 100
  );
  const soldOut = raisedUSD >= CONFIG.presale.hardCapUSD;

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
      {/* Hero */}
      <section className="max-w-3xl mx-auto text-center py-16 px-6">
        <h2 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
          MoonShip Presale
        </h2>
        <p className="mt-4 text-white/70">
          Raising <b>${CONFIG.presale.hardCapUSD.toLocaleString()}</b>. Ends at{" "}
          <b>${CONFIG.presale.batchPrice.toFixed(2)}</b>.
        </p>
        <p className="mt-2 text-indigo-400 font-semibold">
          Current Batch: {currentBatch} / {totalBatches}
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
    </div>
  );
}
