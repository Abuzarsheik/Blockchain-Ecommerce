import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { api } from '../services/api';
import { walletService, SUPPORTED_CURRENCIES } from '../services/walletService';
import { 
  Wallet, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy, 
  ExternalLink,
  Send,
  Download,
  History,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Globe
} from 'lucide-react';
import { logger } from '../utils/logger';
import './WalletManager.css';

const WalletManager = () => {
  const [walletInfo, setWalletInfo] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);

  // Payment form state with enhanced validation
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'ETH',
    recipient: '',
    description: '',
    priority: 'standard'
  });

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    currency: 'ETH',
    destinationAddress: '',
    description: '',
    priority: 'standard'
  });

  // Error states
  const [errors, setErrors] = useState({});

  const addNotification = useCallback((message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const initializeWallet = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      await walletService.init();
      const info = walletService.getWalletInfo();
      setWalletInfo(info);
      
      if (info.connected) {
        setBalances(info.balances);
        setConnectionStatus('connected');
        addNotification('Wallet connected successfully', 'success');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      setConnectionStatus('error');
      addNotification('Failed to initialize wallet', 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    initializeWallet();
    loadTransactionHistory();
    
    // Set up event listeners for wallet changes
    const handleAccountChange = () => {
      initializeWallet();
    };
    
    const handleChainChange = () => {
      initializeWallet();
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleChainChange);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleChainChange);
      }
    };
  }, [initializeWallet]);

  const connectWallet = async (walletType) => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      const connectedWallet = await walletService.connectWallet(walletType);
      const info = walletService.getWalletInfo();
      setWalletInfo(info);
      setBalances(info.balances);
      setConnectionStatus('connected');
      
      // Update user wallet address in backend
      await api.put('/users/profile', {
        wallet_address: connectedWallet.address
      });
      
      addNotification(`${info.wallet.name} connected successfully!`, 'success');
      
    } catch (error) {
      logger.error('Failed to connect wallet:', error);
      setConnectionStatus('error');
      addNotification(`Failed to connect wallet: ${error.message}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    walletService.disconnect();
    setWalletInfo(walletService.getWalletInfo());
    setBalances({});
    setTransactions([]);
    setConnectionStatus('disconnected');
    addNotification('Wallet disconnected', 'info');
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

  const validatePaymentForm = () => {
    const newErrors = {};
    
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (!paymentForm.recipient) {
      newErrors.recipient = 'Recipient address is required';
    } else if (!walletService.isValidAddress(paymentForm.recipient, paymentForm.currency)) {
      newErrors.recipient = 'Invalid address format';
    }

    // Check if sufficient balance
    const balance = balances[paymentForm.currency]?.balance || 0;
    if (parseFloat(paymentForm.amount) > balance) {
      newErrors.amount = 'Insufficient balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const processPayment = async (e) => {
    e.preventDefault();
    
    if (!validatePaymentForm()) return;
    
    setLoading(true);

    try {
      const result = await walletService.processPayment({
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });

      if (result.success) {
        addNotification('Payment processed successfully!', 'success');
        setPaymentForm({ 
          amount: '', 
          currency: 'ETH', 
          recipient: '', 
          description: '',
          priority: 'standard'
        });
        await loadTransactionHistory();
        await refreshBalances();
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      logger.error('Payment processing failed:', error);
      addNotification(`Payment failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!withdrawalForm.amount || !withdrawalForm.destinationAddress) {
        throw new Error('Please fill in all required fields');
      }

      if (!walletService.isValidAddress(withdrawalForm.destinationAddress, withdrawalForm.currency)) {
        throw new Error('Invalid destination address');
      }

      const response = await api.post('/payments/withdraw', withdrawalForm);

      if (response.data.success) {
        addNotification('Withdrawal processed successfully!', 'success');
        setWithdrawalForm({ 
          amount: '', 
          currency: 'ETH', 
          destinationAddress: '', 
          description: '',
          priority: 'standard'
        });
        await loadTransactionHistory();
      } else {
        throw new Error(response.data.error);
      }

    } catch (error) {
      logger.error('Withdrawal processing failed:', error);
      addNotification(`Withdrawal failed: ${error.response?.data?.error || error.message}`, 'error');
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
      addNotification('Balances updated', 'success');
    } catch (error) {
      logger.error('Failed to refresh balances:', error);
      addNotification('Failed to refresh balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      addNotification('Copied to clipboard!', 'success');
    } catch (error) {
      addNotification('Failed to copy', 'error');
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (amount, currency) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
    return `${formatter.format(amount)} ${currency}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      failed: <XCircle className="w-4 h-4" />,
      cancelled: <AlertCircle className="w-4 h-4" />
    };
    return icons[status] || <AlertCircle className="w-4 h-4" />;
  };

  const getConnectionStatusColor = () => {
    const colors = {
      connected: 'bg-green-100 text-green-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[connectionStatus] || 'bg-gray-100 text-gray-800';
  };

  if (!walletInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="animate-pulse">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg shadow-lg transition-all duration-300 ${
                  notification.type === 'success' ? 'bg-green-500 text-white' :
                  notification.type === 'error' ? 'bg-red-500 text-white' :
                  'bg-blue-500 text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {getStatusIcon(notification.type === 'success' ? 'confirmed' : 'pending')}
                  <span className="text-sm font-medium">{notification.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Wallet Manager
          </h1>
          <p className="text-lg text-gray-600">
            Securely manage your digital assets and transactions
          </p>
        </div>

        {/* Connection Status Banner */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${getConnectionStatusColor()}`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    Connection Status
                  </h3>
                  <p className="text-gray-600 capitalize">
                    {connectionStatus === 'connected' && walletInfo?.wallet ? 
                      `${walletInfo.wallet.name} Connected` : 
                      connectionStatus.replace('_', ' ')
                    }
                  </p>
                </div>
              </div>
              <Badge className={getConnectionStatusColor()}>
                {connectionStatus.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Connection Section */}
        <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span>Wallet Connection</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!walletInfo.connected ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose your preferred wallet to start managing your digital assets securely
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {walletInfo.supportedWallets.map((wallet) => (
                    <button
                      key={wallet.type}
                      onClick={() => connectWallet(wallet.type)}
                      disabled={isConnecting}
                      className="group relative overflow-hidden bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex flex-col items-center space-y-4">
                        <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                          {wallet.icon}
                        </div>
                        <div className="text-center">
                          <h4 className="font-semibold text-lg text-gray-900">
                            {wallet.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {wallet.type === 'metamask' ? 'Browser Extension' :
                             wallet.type === 'wallet_connect' ? 'Mobile & Desktop' :
                             'Mobile Wallet'}
                          </p>
                        </div>
                        {wallet.installed && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Available
                          </Badge>
                        )}
                      </div>
                      
                      {isConnecting && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Connected Wallet Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {walletInfo.wallet.name} Connected
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {formatAddress(walletInfo.wallet.address)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(walletInfo.wallet.address)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={disconnectWallet}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>

                  {/* Balance Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(balances).map(([currency, balanceInfo]) => (
                      <div key={currency} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {currency.slice(0, 2)}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">{currency}</span>
                          </div>
                          <button
                            onClick={refreshBalances}
                            disabled={loading}
                            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">
                              {showBalances ? 
                                formatCurrency(balanceInfo.balance, currency) : 
                                '••••••'
                              }
                            </div>
                            <button
                              onClick={() => setShowBalances(!showBalances)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {showBalances ? 
                                <Eye className="w-4 h-4 text-gray-600" /> :
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              }
                            </button>
                          </div>
                          <div className="text-sm text-gray-600">
                            ≈ ${showBalances ? (balanceInfo.usdValue?.toFixed(2) || '0.00') : '••••'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        {walletInfo.connected && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-2 bg-white rounded-xl shadow-sm">
              {[
                { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'send', label: 'Send Payment', icon: <Send className="w-4 h-4" /> },
                { id: 'withdraw', label: 'Withdraw', icon: <Download className="w-4 h-4" /> },
                { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      <span>Wallet Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center space-x-2">
                          <Shield className="w-5 h-5 text-green-600" />
                          <span>Security Info</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Wallet Address</span>
                            <div className="flex items-center space-x-2">
                              <code className="text-xs bg-white px-2 py-1 rounded">
                                {formatAddress(walletInfo.wallet.address)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(walletInfo.wallet.address)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Wallet Type</span>
                            <span className="text-sm text-gray-600">{walletInfo.wallet.name}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">Network</span>
                            <Badge className="bg-blue-100 text-blue-800">Ethereum</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center space-x-2">
                          <Globe className="w-5 h-5 text-purple-600" />
                          <span>Supported Assets</span>
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(SUPPORTED_CURRENCIES).map(([symbol, info]) => (
                            <div
                              key={symbol}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {symbol.slice(0, 2)}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">{info.name}</div>
                                  <div className="text-xs text-gray-500">{symbol}</div>
                                </div>
                              </div>
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                {info.type.toUpperCase()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'send' && (
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Send className="w-6 h-6 text-blue-600" />
                      <span>Send Payment</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={processPayment} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Amount *
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="any"
                              value={paymentForm.amount}
                              onChange={(e) => {
                                setPaymentForm({ ...paymentForm, amount: e.target.value });
                                if (errors.amount) setErrors({ ...errors, amount: null });
                              }}
                              placeholder="0.00"
                              className={`pr-16 ${errors.amount ? 'border-red-500' : ''}`}
                              required
                            />
                            <div className="absolute right-3 top-3 text-sm text-gray-500">
                              {paymentForm.currency}
                            </div>
                          </div>
                          {errors.amount && (
                            <p className="text-sm text-red-600 flex items-center space-x-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>{errors.amount}</span>
                            </p>
                          )}
                          {paymentForm.amount && (
                            <p className="text-sm text-gray-600">
                              Available: {formatCurrency(balances[paymentForm.currency]?.balance || 0, paymentForm.currency)}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Currency *
                          </label>
                          <select
                            value={paymentForm.currency}
                            onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Object.keys(SUPPORTED_CURRENCIES).map(currency => (
                              <option key={currency} value={currency}>
                                {currency} - {SUPPORTED_CURRENCIES[currency].name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Recipient Address *
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={paymentForm.recipient}
                            onChange={(e) => {
                              setPaymentForm({ ...paymentForm, recipient: e.target.value });
                              if (errors.recipient) setErrors({ ...errors, recipient: null });
                            }}
                            placeholder="0x..."
                            className={`pr-10 ${errors.recipient ? 'border-red-500' : ''}`}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                        {errors.recipient && (
                          <p className="text-sm text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{errors.recipient}</span>
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Description (Optional)
                          </label>
                          <Input
                            type="text"
                            value={paymentForm.description}
                            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                            placeholder="Payment for..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            value={paymentForm.priority}
                            onChange={(e) => setPaymentForm({ ...paymentForm, priority: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="slow">Slow (Low Fee)</option>
                            <option value="standard">Standard</option>
                            <option value="fast">Fast (High Fee)</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Transaction Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Amount:</span>
                            <span className="font-medium text-blue-900">
                              {paymentForm.amount || '0'} {paymentForm.currency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Estimated Fee:</span>
                            <span className="font-medium text-blue-900">
                              ~0.005 ETH
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-blue-700">Total:</span>
                            <span className="text-blue-900">
                              {(parseFloat(paymentForm.amount) + 0.005).toFixed(6) || '0.005'} ETH
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || !paymentForm.amount || !paymentForm.recipient}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Send className="w-4 h-4" />
                            <span>Send Payment</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'withdraw' && (
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Download className="w-6 h-6 text-green-600" />
                      <span>Withdraw Funds</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={processWithdrawal} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Amount *
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="any"
                              value={withdrawalForm.amount}
                              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                              placeholder="0.00"
                              className="pr-16"
                              required
                            />
                            <div className="absolute right-3 top-3 text-sm text-gray-500">
                              {withdrawalForm.currency}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Currency *
                          </label>
                          <select
                            value={withdrawalForm.currency}
                            onChange={(e) => setWithdrawalForm({ ...withdrawalForm, currency: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            {Object.keys(SUPPORTED_CURRENCIES).map(currency => (
                              <option key={currency} value={currency}>
                                {currency} - {SUPPORTED_CURRENCIES[currency].name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Destination Address *
                        </label>
                        <Input
                          type="text"
                          value={withdrawalForm.destinationAddress}
                          onChange={(e) => setWithdrawalForm({ ...withdrawalForm, destinationAddress: e.target.value })}
                          placeholder="Your external wallet address"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Description (Optional)
                          </label>
                          <Input
                            type="text"
                            value={withdrawalForm.description}
                            onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
                            placeholder="Withdrawal to..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            value={withdrawalForm.priority}
                            onChange={(e) => setWithdrawalForm({ ...withdrawalForm, priority: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="slow">Slow (Low Fee)</option>
                            <option value="standard">Standard</option>
                            <option value="fast">Fast (High Fee)</option>
                          </select>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Download className="w-4 h-4" />
                            <span>Withdraw Funds</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'history' && (
                <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <History className="w-6 h-6 text-purple-600" />
                      <span>Transaction History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <History className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                        <p className="text-gray-600">Your transaction history will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  tx.type === 'send' ? 'bg-red-100' : 'bg-green-100'
                                }`}>
                                  {tx.type === 'send' ? 
                                    <ArrowUpRight className="w-5 h-5 text-red-600" /> :
                                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                                  }
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 capitalize">
                                  {tx.type} {tx.currency}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatAddress(tx.txHash || 'Pending...')}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(tx.timestamp).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {tx.type === 'send' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency)}
                              </div>
                              <Badge className={getStatusColor(tx.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(tx.status)}
                                  <span className="capitalize">{tx.status}</span>
                                </div>
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletManager; 
