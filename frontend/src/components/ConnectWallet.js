import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { walletService, WALLET_TYPES } from '../services/walletService';
import { 
  Wallet, 
  RefreshCw, 
  Shield, 
  Zap, 
  Globe, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Download,
  Smartphone,
  Monitor,
  X,
  Star,
  Users,
  Lock,
  Layers,
  ArrowRight,
  Info,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  QrCode,
  Wifi,
  Eye,
  Activity
} from 'lucide-react';
import { logger } from '../utils/logger';

const ConnectWallet = ({ 
  isModal = false, 
  onClose, 
  onConnect, 
  autoConnect = false,
  showHeader = true 
}) => {
  const [availableWallets, setAvailableWallets] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [walletStats, setWalletStats] = useState({});

  useEffect(() => {
    initializeWalletDetection();
    
    // Auto-connect if previously connected and autoConnect is enabled
    if (autoConnect) {
      checkPreviousConnection();
    }

    // Load wallet statistics
    loadWalletStats();
  }, [autoConnect]);

  const initializeWalletDetection = async () => {
    try {
      await walletService.init();
      const wallets = await walletService.detectAvailableWallets();
      setAvailableWallets(wallets);
    } catch (error) {
      logger.error('Failed to initialize wallet detection:', error);
      setErrors({ init: 'Failed to detect available wallets' });
    }
  };

  const checkPreviousConnection = async () => {
    try {
      const walletInfo = walletService.getWalletInfo();
      if (walletInfo?.connected) {
        setConnectionStatus('connected');
        if (onConnect) {
          onConnect(walletInfo);
        }
      }
    } catch (error) {
      logger.error('Failed to check previous connection:', error);
    }
  };

  const loadWalletStats = () => {
    // Mock wallet statistics - in real app, fetch from API
    setWalletStats({
      totalUsers: '50M+',
      securityScore: '99.9%',
      uptime: '99.8%',
      supportedNetworks: 15
    });
  };

  const connectWallet = async (walletType) => {
    setIsConnecting(true);
    setSelectedWallet(walletType);
    setConnectionStatus('connecting');
    setCurrentStep(2);
    setErrors({});

    try {
      // Simulate connection steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(3);
      
      const connectedWallet = await walletService.connectWallet(walletType);
      setConnectionStatus('connected');
      setCurrentStep(4);
      
      if (onConnect) {
        onConnect(connectedWallet);
      }
      
      // Auto close modal after successful connection
      if (isModal && onClose) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }

    } catch (error) {
      logger.error('Failed to connect wallet:', error);
      setConnectionStatus('error');
      setErrors({ [walletType]: error.message });
      setCurrentStep(1);
    } finally {
      setIsConnecting(false);
      setSelectedWallet(null);
    }
  };

  const getWalletDetails = (wallet) => {
    const details = {
      [WALLET_TYPES.METAMASK]: {
        description: 'The most trusted crypto wallet with 30M+ users worldwide',
        features: ['Browser Extension', 'DeFi Compatible', 'NFT Support', 'Multi-chain'],
        pros: ['Industry standard', 'Wide compatibility', 'Strong security', 'Active development'],
        cons: ['Browser only', 'Gas fee complexity'],
        downloadUrl: 'https://metamask.io/download/',
        platforms: ['Chrome', 'Firefox', 'Edge', 'Brave'],
        rating: 4.8,
        users: '30M+',
        securityFeatures: ['Hardware wallet support', 'Seed phrase backup', '2FA support']
      },
      [WALLET_TYPES.TRUST_WALLET]: {
        description: 'Mobile-first wallet trusted by millions, now with DeFi integration',
        features: ['Mobile App', 'Multi-chain', 'Built-in DEX', 'Staking'],
        pros: ['Mobile optimized', 'Multiple blockchains', 'Built-in DeFi', 'User-friendly'],
        cons: ['Mobile focused', 'Limited browser features'],
        downloadUrl: 'https://trustwallet.com/download/',
        platforms: ['iOS', 'Android', 'Browser Extension'],
        rating: 4.6,
        users: '25M+',
        securityFeatures: ['Biometric login', 'Secure enclave', 'Recovery phrases']
      },
      [WALLET_TYPES.WALLET_CONNECT]: {
        description: 'Universal protocol connecting 300+ wallets to thousands of dApps',
        features: ['Universal Connection', 'Mobile Bridge', 'Multi-wallet', 'QR Scanning'],
        pros: ['Works with many wallets', 'Mobile friendly', 'No installation', 'Protocol standard'],
        cons: ['Requires mobile wallet', 'Connection dependent'],
        downloadUrl: null,
        platforms: ['Any WalletConnect wallet'],
        rating: 4.7,
        users: '15M+',
        securityFeatures: ['End-to-end encryption', 'Session management', 'Permission control']
      }
    };

    return details[wallet.type] || {
      description: 'Secure Web3 wallet integration',
      features: ['Blockchain Access'],
      pros: ['Secure'],
      cons: [],
      downloadUrl: null,
      platforms: [],
      rating: 4.0,
      users: '1M+',
      securityFeatures: ['Basic security']
    };
  };

  const getStatusColor = () => {
    const colors = {
      connected: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
      connecting: 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white',
      disconnected: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
      error: 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
    };
    return colors[connectionStatus] || colors.disconnected;
  };

  const getConnectionSteps = () => {
    return [
      { id: 1, title: 'Select Wallet', description: 'Choose your preferred wallet' },
      { id: 2, title: 'Initiating', description: 'Opening wallet connection' },
      { id: 3, title: 'Authorizing', description: 'Confirm in your wallet' },
      { id: 4, title: 'Connected', description: 'Connection successful!' }
    ];
  };

  const containerClasses = isModal 
    ? "fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    : "min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6 relative overflow-hidden";

  const cardClasses = isModal
    ? "bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl border border-white border-opacity-20 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
    : "max-w-6xl mx-auto";

  return (
    <div className={containerClasses}>
      {/* Background Decoration for non-modal */}
      {!isModal && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 opacity-20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600 to-indigo-600 opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}

      <div className={cardClasses}>
        {/* Enhanced Header */}
        {showHeader && (
          <div className="relative overflow-hidden">
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-300 z-10 backdrop-blur-sm"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            )}
            
            <div className="relative py-12 px-8 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
              }}></div>
              
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                  <Wallet className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Connect Your Wallet
                </h1>
                <p className="text-xl text-blue-100 max-w-3xl mx-auto font-light leading-relaxed">
                  Join millions of users in the decentralized future. Choose your wallet to securely access DeFi, NFTs, and Web3 applications.
                </p>
                
                {/* Stats Bar */}
                <div className="flex justify-center items-center gap-8 mt-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{walletStats.totalUsers}</div>
                    <div className="text-sm text-blue-200">Active Users</div>
                  </div>
                  <div className="w-px h-8 bg-white bg-opacity-30"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{walletStats.securityScore}</div>
                    <div className="text-sm text-blue-200">Security Score</div>
                  </div>
                  <div className="w-px h-8 bg-white bg-opacity-30"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{walletStats.supportedNetworks}+</div>
                    <div className="text-sm text-blue-200">Networks</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 space-y-8">
          {/* Connection Status with Steps */}
          {connectionStatus !== 'disconnected' && (
            <Card className="bg-white bg-opacity-10 backdrop-blur-xl border border-white border-opacity-20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${getStatusColor()}`}>
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : connectionStatus === 'connected' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {connectionStatus === 'connecting' 
                          ? `Connecting to ${selectedWallet}...`
                          : connectionStatus === 'connected'
                          ? 'Wallet Connected Successfully!'
                          : 'Connection Failed'
                        }
                      </h3>
                      <p className="text-gray-300">
                        {connectionStatus === 'connecting' 
                          ? 'Please approve the connection in your wallet app'
                          : connectionStatus === 'connected'
                          ? 'You can now interact with decentralized applications'
                          : 'Please try again or choose a different wallet'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor()} px-4 py-2 text-sm font-semibold`}>
                    {connectionStatus.toUpperCase()}
                  </Badge>
                </div>

                {/* Connection Steps Progress */}
                {isConnecting && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      {getConnectionSteps().map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            currentStep >= step.id ? 'bg-green-500 text-white' : 
                            currentStep === step.id ? 'bg-blue-500 text-white animate-pulse' : 
                            'bg-gray-600 text-gray-400'
                          }`}>
                            {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                          </div>
                          {index < getConnectionSteps().length - 1 && (
                            <div className={`flex-1 h-1 mx-4 rounded ${
                              currentStep > step.id ? 'bg-green-500' : 'bg-gray-600'
                            }`}></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <p className="text-white font-medium">
                        {getConnectionSteps().find(s => s.id === currentStep)?.title}
                      </p>
                      <p className="text-gray-300 text-sm">
                        {getConnectionSteps().find(s => s.id === currentStep)?.description}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Wallet Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {availableWallets.map((wallet) => {
              const details = getWalletDetails(wallet);
              const hasError = errors[wallet.type];
              
              return (
                <Card
                  key={wallet.type}
                  className={`group relative overflow-hidden transition-all duration-500 hover:scale-105 cursor-pointer ${
                    wallet.installed 
                      ? 'bg-white bg-opacity-10 backdrop-blur-xl border border-white border-opacity-20 hover:bg-opacity-20' 
                      : 'bg-white bg-opacity-5 backdrop-blur-xl border border-white border-opacity-10'
                  } ${hasError ? 'border-red-400 bg-red-900 bg-opacity-20' : ''}`}
                  onClick={() => wallet.installed ? connectWallet(wallet.type) : null}
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 -top-10 -left-10 w-20 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 rotate-12 transform group-hover:animate-shimmer group-hover:opacity-20"></div>
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                          {wallet.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                            {wallet.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor(details.rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-300">{details.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {wallet.installed ? (
                          <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                            <Activity className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white text-xs px-2 py-1">
                            <Download className="w-3 h-3 mr-1" />
                            Install
                          </Badge>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-gray-300">
                          <Users className="w-3 h-3" />
                          <span>{details.users}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-6">
                    {/* Description */}
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {details.description}
                    </p>

                    {/* Features Grid */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center">
                        <Layers className="w-4 h-4 mr-2" />
                        Key Features
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {details.features.slice(0, 4).map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-200 text-xs rounded-lg text-center"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Security Features */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-green-400" />
                        Security
                      </h4>
                      <div className="space-y-1">
                        {details.securityFeatures.slice(0, 2).map((feature) => (
                          <div key={feature} className="flex items-center space-x-2 text-xs text-gray-300">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Platforms */}
                    <div>
                      <h4 className="font-semibold text-white mb-3 flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        Platforms
                      </h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-300">
                        {details.platforms.includes('Chrome') || details.platforms.includes('Firefox') ? (
                          <div className="flex items-center space-x-1">
                            <Monitor className="w-4 h-4" />
                            <span className="text-xs">Desktop</span>
                          </div>
                        ) : null}
                        {details.platforms.includes('iOS') || details.platforms.includes('Android') ? (
                          <div className="flex items-center space-x-1">
                            <Smartphone className="w-4 h-4" />
                            <span className="text-xs">Mobile</span>
                          </div>
                        ) : null}
                        <span className="text-xs text-gray-400">
                          {details.platforms.slice(0, 2).join(', ')}
                          {details.platforms.length > 2 && ` +${details.platforms.length - 2}`}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      {wallet.installed ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            connectWallet(wallet.type);
                          }}
                          disabled={isConnecting}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                        >
                          {isConnecting && selectedWallet === wallet.type ? (
                            <div className="flex items-center justify-center space-x-2">
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>Connecting...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Zap className="w-5 h-5" />
                              <span>Connect Wallet</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (details.downloadUrl) {
                                window.open(details.downloadUrl, '_blank');
                              }
                            }}
                            variant="outline"
                            className="w-full border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10"
                            disabled={!details.downloadUrl}
                          >
                            <div className="flex items-center justify-center space-x-2">
                              <Download className="w-4 h-4" />
                              <span>Install {wallet.name}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </Button>
                          <p className="text-xs text-gray-400 text-center">
                            Install the wallet extension/app first to continue
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {hasError && (
                      <div className="mt-4 p-4 bg-red-900 bg-opacity-50 border border-red-500 border-opacity-50 rounded-xl">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-300">Connection Failed</p>
                            <p className="text-xs text-red-400 mt-1">{hasError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isConnecting && selectedWallet === wallet.type && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                        <div className="text-center text-white">
                          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
                          <p className="text-lg font-semibold mb-2">Connecting to {wallet.name}</p>
                          <p className="text-sm text-gray-300">Please confirm in your wallet</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Enhanced Security Information */}
          <Card className="bg-gradient-to-r from-green-900 from-green-900 to-emerald-900 bg-opacity-50 backdrop-blur-xl border border-green-500 border-opacity-30">
            <CardContent className="p-8">
              <div className="flex items-start space-x-6">
                <div className="p-4 bg-green-500 bg-opacity-20 rounded-2xl flex-shrink-0">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-green-100 mb-4">Bank-Grade Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {[
                        'Your private keys never leave your wallet',
                        'We only request permission to view your public address',
                        'All transactions require your explicit approval',
                        'You remain in full control of your assets'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-green-100">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {[
                        'End-to-end encryption for all communications',
                        'Multi-signature support for enhanced security',
                        'Regular security audits by top firms',
                        'Hardware wallet integration available'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <Lock className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-green-100">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options & Troubleshooting */}
          <div className="space-y-6">
            {/* Advanced Connection Options */}
            <Card className="bg-white bg-opacity-10 backdrop-blur-xl border border-white border-opacity-20">
              <CardContent className="p-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <Settings className="w-6 h-6 text-blue-400" />
                    <span className="text-lg font-semibold text-white group-hover:text-blue-200 transition-colors">
                      Advanced Connection Options
                    </span>
                  </div>
                  <div className={`transform transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  </div>
                </button>

                {showAdvanced && (
                  <div className="mt-6 space-y-6 border-t border-white border-opacity-20 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://walletconnect.com/', '_blank')}
                        className="flex items-center justify-center space-x-2 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10"
                      >
                        <Wifi className="w-5 h-5" />
                        <span>WalletConnect Protocol</span>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://ethereum.org/en/wallets/', '_blank')}
                        className="flex items-center justify-center space-x-2 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10"
                      >
                        <Shield className="w-5 h-5" />
                        <span>Security Guide</span>
                        <ExternalLink className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        className="flex items-center justify-center space-x-2 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10"
                      >
                        <QrCode className="w-5 h-5" />
                        <span>QR Code Connection</span>
                      </Button>

                      <Button
                        variant="outline"
                        className="flex items-center justify-center space-x-2 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-10"
                      >
                        <Eye className="w-5 h-5" />
                        <span>Read-Only Mode</span>
                      </Button>
                    </div>

                    <div className="bg-blue-900 bg-opacity-30 rounded-xl p-6 border border-blue-500 border-opacity-30">
                      <h4 className="font-semibold text-blue-200 mb-4 flex items-center">
                        <Info className="w-5 h-5 mr-2" />
                        Connection Methods
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-blue-100 mb-2">Browser Extension</h5>
                          <ul className="space-y-1 text-blue-200 text-xs">
                            <li>• Direct integration with your browser</li>
                            <li>• Fastest connection method</li>
                            <li>• Works with desktop applications</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-100 mb-2">Mobile Wallet</h5>
                          <ul className="space-y-1 text-blue-200 text-xs">
                            <li>• Connect via QR code scanning</li>
                            <li>• Works with any WalletConnect wallet</li>
                            <li>• Secure mobile-to-web bridging</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Troubleshooting Section */}
            <Card className="bg-white bg-opacity-10 backdrop-blur-xl border border-white border-opacity-20">
              <CardContent className="p-6">
                <button
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <HelpCircle className="w-6 h-6 text-yellow-400" />
                    <span className="text-lg font-semibold text-white group-hover:text-yellow-200 transition-colors">
                      Having Connection Issues?
                    </span>
                  </div>
                  <div className={`transform transition-transform duration-300 ${showTroubleshooting ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  </div>
                </button>

                {showTroubleshooting && (
                  <div className="mt-6 space-y-6 border-t border-white border-opacity-20 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-yellow-200 mb-3">Common Solutions</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Make sure your wallet extension is unlocked</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Check that you're on the correct network (Ethereum Mainnet)</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Try refreshing the page and reconnecting</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Disable other wallet extensions temporarily</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Clear your browser cache and cookies</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-200 mb-3">Advanced Troubleshooting</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Update your wallet to the latest version</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Check if the website is on your wallet's blocked list</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Try using a different browser or incognito mode</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Reset your wallet connection permissions</span>
                          </li>
                          <li className="flex items-start space-x-2">
                            <span className="text-yellow-400 mt-1">•</span>
                            <span>Contact wallet support if issues persist</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-yellow-900 bg-opacity-30 rounded-xl p-6 border border-yellow-500 border-opacity-30">
                      <h4 className="font-semibold text-yellow-200 mb-3">Still Need Help?</h4>
                      <p className="text-yellow-100 text-sm mb-4">
                        If you're still experiencing issues, our support team is here to help you get connected safely.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-500 border-opacity-50 text-yellow-200 hover:bg-yellow-500 hover:bg-opacity-20"
                        >
                          Contact Support
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-500 border-opacity-50 text-yellow-200 hover:bg-yellow-500 hover:bg-opacity-20"
                        >
                          View FAQ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-yellow-500 border-opacity-50 text-yellow-200 hover:bg-yellow-500 hover:bg-opacity-20"
                        >
                          Join Discord
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          {!isModal && (
            <div className="text-center text-sm text-gray-400 space-y-4">
              <div className="flex justify-center items-center space-x-6">
                <a
                  href="https://ethereum.org/en/wallets/find-wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Learn about choosing a wallet
                </a>
                <span>•</span>
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Security best practices
                </a>
                <span>•</span>
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Supported networks
                </a>
              </div>
              <p className="text-gray-500">
                By connecting a wallet, you agree to our Terms of Service and acknowledge our Privacy Policy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectWallet; 