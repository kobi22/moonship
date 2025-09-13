import React, { Suspense } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

import MoonShipInner from "./MoonShipInner.jsx";

// ✅ Lazy load wallets
const LazyWallets = React.lazy(async () => {
  const {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    CoinbaseWalletAdapter,
    LedgerWalletAdapter,
  } = await import("@solana/wallet-adapter-wallets");

  return {
    default: function WalletWrapper({ children }) {
      const network = WalletAdapterNetwork.Mainnet;
      const endpoint = clusterApiUrl(network);

      const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
        new CoinbaseWalletAdapter(),
        new LedgerWalletAdapter(),
      ];

      return (
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      );
    },
  };
});

export default function MoonShipPresale() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading wallets...</div>}>
      <LazyWallets>
        <MoonShipInner />
      </LazyWallets>
    </Suspense>
  );
}

