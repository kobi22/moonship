import { Buffer } from "buffer";
window.Buffer = Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import MoonShipPresale from "./MoonShipPresale.jsx";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import "@solana/wallet-adapter-react-ui/styles.css";

const network = WalletAdapterNetwork.Mainnet;
// Optional: use your own RPC via Vercel env VITE_SOLANA_RPC; falls back to cluster
const endpoint = import.meta.env.VITE_SOLANA_RPC || clusterApiUrl(network);

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
  new CoinbaseWalletAdapter(),
  new LedgerWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <MoonShipPresale />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
