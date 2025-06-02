import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { api } from '../services/api';
import { useSelector } from 'react-redux';
import { walletService, WALLET_TYPES, SUPPORTED_CURRENCIES } from '../services/walletService';
import { Wallet, CreditCard, DollarSign, RefreshCw, Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';
import { logger } from '../utils/logger';

const WalletManager = () => {
  const { user } = useSelector((state) => state.auth);
  const [walletInfo, setWalletInfo] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'ETH',
    recipient: '',
    description: ''
  });

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    currency: 'ETH',
    destinationAddress: '',
    description: ''
  });

  useEffect(() => {
    initializeWallet();
    loadTransactionHistory();
  }, []);

  const initializeWallet = async () => {
    try {
      await walletService.init();
      const info = walletService.getWalletInfo();
      setWalletInfo(info);
      
      if (info.connected) {
        setBalances(info.balances);
      }
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
    }
  };

  const connectWallet = async (walletType) => {
    setIsConnecting(true);
    try {
      const connectedWallet = await walletService.connectWallet(walletType);
      const info = walletService.getWalletInfo();
      setWalletInfo(info);
      setBalances(info.balances);
      
      // Update user wallet address in backend
      await api.put('/users/profile', {
        wallet_address: connectedWallet.address
      });
      
    } catch (error) {
      logger.error('Failed to connect wallet:', error);
      alert(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    walletService.disconnect();
    setWalletInfo(walletService.getWalletInfo());
    setBalances({});
    setTransactions([]);
  };

  const loadTransactionHistory = async () => {
    try {
      const response = await api.get('/payments/transactions');
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      logger.error('Failed to load transaction history:', error);
    }
  };

  const processPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!paymentForm.amount || !paymentForm.recipient) {
        throw new Error('Please fill in all required fields');
      }

      if (!walletService.isValidAddress(paymentForm.recipient, paymentForm.currency)) {
        throw new Error('Invalid recipient address');
      }

      // Process payment through wallet service
      const result = await walletService.processPayment({
        amount: paymentForm.amount,
        currency: paymentForm.currency,
        recipient: paymentForm.recipient,
        description: paymentForm.description
      });

      if (result.success) {
        alert('Payment processed successfully!');
        setPaymentForm({ amount: '', currency: 'ETH', recipient: '', description: '' });
        await loadTransactionHistory();
        await walletService.loadBalances();
        setBalances(walletService.getWalletInfo().balances);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      logger.error('Payment processing failed:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!withdrawalForm.amount || !withdrawalForm.destinationAddress) {
        throw new Error('Please fill in all required fields');
      }

      if (!walletService.isValidAddress(withdrawalForm.destinationAddress, withdrawalForm.currency)) {
        throw new Error('Invalid destination address');
      }

      // Process withdrawal through API
      const response = await api.post('/payments/withdraw', withdrawalForm);

      if (response.data.success) {
        alert('Withdrawal processed successfully!');
        setWithdrawalForm({ amount: '', currency: 'ETH', destinationAddress: '', description: '' });
        await loadTransactionHistory();
      } else {
        throw new Error(response.data.error);
      }

    } catch (error) {
      logger.error('Withdrawal processing failed:', error);
      alert(`Withdrawal failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (!walletInfo?.connected) return;
    
    setLoading(true);
    try {
      await walletService.loadBalances();
      setBalances(walletService.getWalletInfo().balances);
    } catch (error) {
      logger.error('Failed to refresh balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-orange-600',
      confirmed: 'text-green-600',
      failed: 'text-red-600',
      cancelled: 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      failed: '❌',
      cancelled: '🚫'
    };
    return icons[status] || '❓';
  };

  if (!walletInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading wallet service...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Connection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>💳</span>
            <span>Wallet Manager</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!walletInfo.connected ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect Your Wallet</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {walletInfo.supportedWallets.map((wallet) => (
                  <Button
                    key={wallet.type}
                    onClick={() => connectWallet(wallet.type)}
                    disabled={isConnecting}
                    className="h-20 flex flex-col items-center space-y-2"
                  >
                    <span className="text-2xl">{wallet.icon}</span>
                    <span>{wallet.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {walletInfo.wallet.name} Connected
                  </h3>
                  <p className="text-gray-600">
                    {formatAddress(walletInfo.wallet.address)}
                  </p>
                </div>
                <Button 
                  onClick={disconnectWallet}
                  variant="outline"
                  size="sm"
                >
                  Disconnect
                </Button>
              </div>

              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(balances).map(([currency, balanceInfo]) => (
                  <div key={currency} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{currency}</span>
                      <Button
                        onClick={refreshBalances}
                        size="sm"
                        variant="outline"
                        disabled={loading}
                      >
                        🔄
                      </Button>
                    </div>
                    <div className="mt-2">
                      <div className="text-xl font-bold">
                        {walletService.formatAmount(balanceInfo.balance, currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        ≈ ${balanceInfo.usdValue?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      {walletInfo.connected && (
        <div>
          <div className="flex space-x-4 mb-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'send', label: 'Send Payment', icon: '💸' },
              { id: 'withdraw', label: 'Withdraw', icon: '💰' },
              { id: 'history', label: 'History', icon: '📜' }
            ].map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                className="flex items-center space-x-2"
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle>Wallet Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Wallet Address</h4>
                      <p className="text-sm text-gray-600 break-all">
                        {walletInfo.wallet.address}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Wallet Type</h4>
                      <p className="text-sm text-gray-600">
                        {walletInfo.wallet.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Supported Currencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(SUPPORTED_CURRENCIES).map(([symbol, info]) => (
                        <span
                          key={symbol}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {symbol} - {info.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'send' && (
            <Card>
              <CardHeader>
                <CardTitle>Send Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={processPayment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Amount
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm,
                          amount: e.target.value
                        })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Currency
                      </label>
                      <select
                        value={paymentForm.currency}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm,
                          currency: e.target.value
                        })}
                        className="w-full p-2 border rounded-md"
                      >
                        {Object.keys(SUPPORTED_CURRENCIES).map(currency => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Recipient Address
                    </label>
                    <Input
                      type="text"
                      value={paymentForm.recipient}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        recipient: e.target.value
                      })}
                      placeholder="0x..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description (Optional)
                    </label>
                    <Input
                      type="text"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        description: e.target.value
                      })}
                      placeholder="Payment for..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Processing...' : 'Send Payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'withdraw' && (
            <Card>
              <CardHeader>
                <CardTitle>Withdraw Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={processWithdrawal} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Amount
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={withdrawalForm.amount}
                        onChange={(e) => setWithdrawalForm({
                          ...withdrawalForm,
                          amount: e.target.value
                        })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Currency
                      </label>
                      <select
                        value={withdrawalForm.currency}
                        onChange={(e) => setWithdrawalForm({
                          ...withdrawalForm,
                          currency: e.target.value
                        })}
                        className="w-full p-2 border rounded-md"
                      >
                        {Object.keys(SUPPORTED_CURRENCIES).map(currency => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Destination Address
                    </label>
                    <Input
                      type="text"
                      value={withdrawalForm.destinationAddress}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        destinationAddress: e.target.value
                      })}
                      placeholder="Your wallet address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description (Optional)
                    </label>
                    <Input
                      type="text"
                      value={withdrawalForm.description}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        description: e.target.value
                      })}
                      placeholder="Withdrawal to..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Processing...' : 'Withdraw Funds'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-2xl">
                            {getStatusIcon(tx.status)}
                          </span>
                          <div>
                            <div className="font-semibold">
                              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatAddress(tx.txHash || 'Pending...')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {tx.amount} {tx.currency}
                          </div>
                          <div className={`text-sm ${getStatusColor(tx.status)}`}>
                            {tx.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletManager; 
