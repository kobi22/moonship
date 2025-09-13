// =============================================================
// CONFIG
// =============================================================
const DEFAULT_TIERS = generateLinearTiers({
  tiers: 30,
  startPrice: 0.05, // 🚀 Launch at $0.05
  endPrice: 0.20,   // Final batch at $0.20
  totalCapUSD: 30_000_000, // Total raise goal in USD
});

const CONFIG = {
  token: {
    name: "MoonShip",
    symbol: "MSHP",
    decimals: 9,
    totalSupply: 1_000_000_000,
  },
  presale: {
    hardCapUSD: DEFAULT_TIERS.reduce((a, t) => a + t.capUSD, 0),
    softCapUSD: 500_000,
    liquidityPercent: 60,
    accepted: ["USDC"], // Raise in USDC
    initialRaisedUSD: 12_870_000,
    tiers: DEFAULT_TIERS,
  },
  airdrop: {
    dropISO: "2025-10-02T00:00:00Z",
    note: "All allocations will be airdropped directly to contributor wallets. No claim is required.",
  },
  socials: {
    twitter: "https://x.com/yourmoonship",
    telegram: "https://t.me/yourmoonship",
    website: "https://moonship.shop",
  },
};
