import { useCallback, useEffect, useState } from "react";
import { getAddress } from "ethers";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Scanner from "./components/Scanner.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import Footer from "./components/Footer.jsx";
import { friendlyError, getSigner, hasWallet, readProvider, walletProvider } from "./lib/chain.js";

export default function App() {
  const [account, setAccount] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [block, setBlock] = useState(null);

  // Live block number for the network badge.
  useEffect(() => {
    let alive = true;
    const tick = () =>
      readProvider.getBlockNumber().then((n) => alive && setBlock(n)).catch(() => alive && setBlock(null));
    tick();
    const timer = setInterval(tick, 12000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Follow account switches made inside the wallet.
  useEffect(() => {
    if (!hasWallet()) return;
    const onAccounts = (accounts) => setAccount(accounts[0] ? getAddress(accounts[0]) : null);
    walletProvider()?.on?.("accountsChanged", onAccounts);
    return () => walletProvider()?.removeListener?.("accountsChanged", onAccounts);
  }, []);

  const connect = useCallback(async () => {
    setWalletError(null);
    try {
      const signer = await getSigner();
      setAccount(await signer.getAddress());
      return true;
    } catch (err) {
      setWalletError(friendlyError(err));
      return false;
    }
  }, []);

  const scanMyWallet = useCallback(async () => {
    if (account || (await connect())) {
      document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [account, connect]);

  return (
    <>
      <Header account={account} block={block} onConnect={connect} />
      <main>
        <Hero onScan={scanMyWallet} walletError={walletError} />
        <Scanner account={account} onConnect={connect} />
        <HowItWorks />
      </main>
      <Footer />
    </>
  );
}
