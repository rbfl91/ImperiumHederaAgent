import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL = 15_000; // refresh every 15 seconds

function shortAddr(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function formatBalance(value, decimals = 4) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return num.toLocaleString('en-AU', { maximumFractionDigits: decimals });
  return num.toFixed(decimals);
}

function formatFaceValue(value) {
  const num = Number(value);
  if (isNaN(num) || num === 0) return '—';
  return `A$${num.toLocaleString('en-AU')}`;
}

function statusBadge(asset) {
  if (asset.expired) return { label: 'Matured', cls: 'wallet-badge--green' };
  if (asset.issued) return { label: 'Active', cls: 'wallet-badge--orange' };
  return { label: asset.status || 'Created', cls: 'wallet-badge--gray' };
}

export default function WalletPanel() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch('/wallet');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setWallet(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    const timer = setInterval(fetchWallet, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchWallet]);

  if (loading) {
    return (
      <div className="wallet-panel">
        <h3 className="wallet-panel-title">WALLET</h3>
        <p className="wallet-panel-loading">Connecting…</p>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="wallet-panel">
        <h3 className="wallet-panel-title">WALLET</h3>
        <p className="wallet-panel-error">Unable to connect to node</p>
      </div>
    );
  }

  const isHedera = wallet.network === 'hedera-testnet';
  const networkLabel = isHedera ? 'Hedera Testnet' : 'Local Hardhat';

  return (
    <div className="wallet-panel">
      <h3 className="wallet-panel-title">WALLET</h3>

      {/* Network + Address */}
      <div className="wallet-network">
        <span className={`wallet-network-dot ${isHedera ? 'wallet-network-dot--hedera' : 'wallet-network-dot--local'}`} />
        <span className="wallet-network-label">{networkLabel}</span>
      </div>

      <div className="wallet-address">
        {wallet.explorerUrl ? (
          <a href={wallet.explorerUrl} target="_blank" rel="noopener noreferrer" className="wallet-address-link">
            {shortAddr(wallet.address)} ↗
          </a>
        ) : (
          <span className="wallet-address-text">{shortAddr(wallet.address)}</span>
        )}
      </div>

      {/* Native Balance */}
      <div className="wallet-balance-card">
        <div className="wallet-balance-row">
          <span className="wallet-balance-symbol">{wallet.native.symbol}</span>
          <span className="wallet-balance-value">{formatBalance(wallet.native.balance)}</span>
        </div>
      </div>

      {/* Stablecoins */}
      {wallet.stablecoins.length > 0 && (
        <div className="wallet-section">
          <h4 className="wallet-section-title">STABLECOINS</h4>
          {wallet.stablecoins.map((sc) => (
            <div key={sc.address} className="wallet-token-row">
              <span className="wallet-token-symbol">{sc.symbol}</span>
              <span className="wallet-token-balance">{formatBalance(sc.balance, 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Issued Assets */}
      {wallet.assets.length > 0 && (
        <div className="wallet-section">
          <h4 className="wallet-section-title">ASSET TOKENS</h4>
          {wallet.assets.map((asset) => {
            const badge = statusBadge(asset);
            const typeLabel = { 'annuity': 'Annuity', 'term-deposit': 'Term Deposit', 'ncd': 'NCD' }[asset.assetType] || 'Annuity';
            return (
              <div key={asset.address} className="wallet-asset-card">
                <div className="wallet-asset-header">
                  <span className="wallet-asset-id">{asset.correlationId}</span>
                  <span className={`wallet-badge ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="wallet-asset-details">
                  <div className="wallet-asset-row">
                    <span>Type</span>
                    <span className="wallet-asset-value">{typeLabel}</span>
                  </div>
                  <div className="wallet-asset-row">
                    <span>Face Value</span>
                    <span className="wallet-asset-value">{formatFaceValue(asset.faceValue)}</span>
                  </div>
                  <div className="wallet-asset-row">
                    <span>Rate</span>
                    <span className="wallet-asset-value">{asset.interestRate ? (asset.interestRate / 100).toFixed(2) + '% p.a.' : '—'}</span>
                  </div>
                  {asset.coupons != null && (
                    <div className="wallet-asset-row">
                      <span>Coupons</span>
                      <span className="wallet-asset-value">{asset.coupons}</span>
                    </div>
                  )}
                  {asset.termDays != null && (
                    <div className="wallet-asset-row">
                      <span>Term</span>
                      <span className="wallet-asset-value">{asset.termDays} days</span>
                    </div>
                  )}
                  <div className="wallet-asset-row">
                    <span>Contract</span>
                    <span className="wallet-asset-value">
                      {asset.explorerUrl ? (
                        <a href={asset.explorerUrl} target="_blank" rel="noopener noreferrer" className="wallet-address-link">
                          {shortAddr(asset.address)} ↗
                        </a>
                      ) : (
                        shortAddr(asset.address)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
