const { ethers } = require('ethers');
const axios = require('axios');

class GasOptimizationService {
    constructor() {
        this.gasStations = {
            ethMainnet: 'https://ethgasstation.info/api/ethgasAPI.json',
            etherscan: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
            polygon: 'https://gasstation-mainnet.matic.network/v2',
            bsc: 'https://api.bscscan.com/api?module=gastracker&action=gasoracle'
        };

        this.gasLimits = {
            'ERC721_MINT': 150000,
            'ERC721_TRANSFER': 85000,
            'ERC1155_MINT': 120000,
            'ERC1155_TRANSFER': 65000,
            'MARKETPLACE_BUY': 200000,
            'MARKETPLACE_LIST': 100000,
            'ESCROW_DEPOSIT': 120000,
            'ESCROW_RELEASE': 80000,
            'SIMPLE_TRANSFER': 21000
        };

        this.optimizationStrategies = {
            IMMEDIATE: 'immediate',
            FAST: 'fast', 
            STANDARD: 'standard',
            SLOW: 'slow',
            BATCH: 'batch'
        };

        this.batchQueue = [];
        this.batchTimer = null;
    }

    /**
     * Get optimized gas price for transaction
     */
    async getOptimizedGasPrice(network = 'ethereum', priority = 'standard') {
        try {
            const gasData = await this.fetchGasData(network);
            
            const prices = this.calculateGasPrices(gasData, network);
            
            // Apply optimization strategy
            const optimizedPrice = this.applyOptimizationStrategy(prices, priority);
            
            return {
                success: true,
                gasPrice: optimizedPrice,
                estimates: prices,
                network,
                priority,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Gas optimization error:', error);
            
            // Fallback to network defaults
            return this.getFallbackGasPrice(network);
        }
    }

    /**
     * Fetch real-time gas data from multiple sources
     */
    async fetchGasData(network) {
        const promises = [];
        
        switch (network.toLowerCase()) {
            case 'ethereum':
            case 'mainnet':
                promises.push(
                    this.fetchFromGasStation(this.gasStations.ethMainnet),
                    this.fetchFromEtherscan(),
                    this.fetchFromProvider('ethereum')
                );
                break;
                
            case 'polygon':
                promises.push(
                    this.fetchFromGasStation(this.gasStations.polygon),
                    this.fetchFromProvider('polygon')
                );
                break;
                
            case 'bsc':
            case 'binance':
                promises.push(
                    this.fetchFromGasStation(this.gasStations.bsc),
                    this.fetchFromProvider('bsc')
                );
                break;
                
            default:
                promises.push(this.fetchFromProvider(network));
        }

        const results = await Promise.allSettled(promises);
        const validResults = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        if (validResults.length === 0) {
            throw new Error('No gas data sources available');
        }

        return this.aggregateGasData(validResults);
    }

    /**
     * Fetch from gas station APIs
     */
    async fetchFromGasStation(url) {
        try {
            const response = await axios.get(url, { timeout: 5000 });
            return this.normalizeGasStationData(response.data, url);
        } catch (error) {
            console.warn('Gas station fetch failed:', error.message);
            throw error;
        }
    }

    /**
     * Fetch from Etherscan API
     */
    async fetchFromEtherscan() {
        try {
            const url = `${this.gasStations.etherscan}&apikey=${process.env.ETHERSCAN_API_KEY}`;
            const response = await axios.get(url, { timeout: 5000 });
            
            return {
                source: 'etherscan',
                slow: ethers.parseUnits(response.data.result.SafeGasPrice, 'gwei'),
                standard: ethers.parseUnits(response.data.result.StandardGasPrice, 'gwei'),
                fast: ethers.parseUnits(response.data.result.FastGasPrice, 'gwei')
            };
        } catch (error) {
            console.warn('Etherscan gas fetch failed:', error.message);
            throw error;
        }
    }

    /**
     * Fetch from blockchain provider
     */
    async fetchFromProvider(network) {
        try {
            const provider = this.getProvider(network);
            const gasPrice = await provider.getGasPrice();
            
            return {
                source: 'provider',
                slow: gasPrice * 80n / 100n,     // 20% below
                standard: gasPrice,               // Current price
                fast: gasPrice * 120n / 100n     // 20% above
            };
        } catch (error) {
            console.warn('Provider gas fetch failed:', error.message);
            throw error;
        }
    }

    /**
     * Normalize gas data from different sources
     */
    normalizeGasStationData(data, url) {
        if (url.includes('ethgasstation')) {
            return {
                source: 'ethgasstation',
                slow: ethers.parseUnits((data.safeLow / 10).toString(), 'gwei'),
                standard: ethers.parseUnits((data.average / 10).toString(), 'gwei'),
                fast: ethers.parseUnits((data.fast / 10).toString(), 'gwei')
            };
        } else if (url.includes('matic.network')) {
            return {
                source: 'polygon',
                slow: ethers.parseUnits(data.safeLow.maxFee.toString(), 'gwei'),
                standard: ethers.parseUnits(data.standard.maxFee.toString(), 'gwei'),
                fast: ethers.parseUnits(data.fast.maxFee.toString(), 'gwei')
            };
        } else if (url.includes('bscscan')) {
            return {
                source: 'bscscan',
                slow: ethers.parseUnits(data.result.SafeGasPrice, 'gwei'),
                standard: ethers.parseUnits(data.result.StandardGasPrice, 'gwei'),
                fast: ethers.parseUnits(data.result.FastGasPrice, 'gwei')
            };
        }

        // Generic format
        return {
            source: 'generic',
            slow: ethers.parseUnits('1', 'gwei'),
            standard: ethers.parseUnits('2', 'gwei'),
            fast: ethers.parseUnits('3', 'gwei')
        };
    }

    /**
     * Aggregate gas data from multiple sources
     */
    aggregateGasData(results) {
        const aggregated = {
            slow: 0n,
            standard: 0n,
            fast: 0n,
            count: results.length
        };

        results.forEach(result => {
            aggregated.slow = aggregated.slow + result.slow;
            aggregated.standard = aggregated.standard + result.standard;
            aggregated.fast = aggregated.fast + result.fast;
        });

        // Calculate averages
        return {
            slow: aggregated.slow / BigInt(aggregated.count),
            standard: aggregated.standard / BigInt(aggregated.count),
            fast: aggregated.fast / BigInt(aggregated.count),
            sources: results.map(r => r.source)
        };
    }

    /**
     * Calculate optimized gas prices
     */
    calculateGasPrices(gasData, network) {
        const basePrice = gasData.standard;
        
        return {
            immediate: gasData.fast * 115n / 100n,  // +15% for immediate
            fast: gasData.fast,
            standard: gasData.standard,
            slow: gasData.slow,
            batch: gasData.slow * 90n / 100n,       // -10% for batch
            
            // Additional estimates
            veryFast: gasData.fast * 130n / 100n,
            verySlow: gasData.slow * 80n / 100n
        };
    }

    /**
     * Apply optimization strategy
     */
    applyOptimizationStrategy(prices, strategy) {
        const strategyMap = {
            [this.optimizationStrategies.IMMEDIATE]: prices.immediate,
            [this.optimizationStrategies.FAST]: prices.fast,
            [this.optimizationStrategies.STANDARD]: prices.standard,
            [this.optimizationStrategies.SLOW]: prices.slow,
            [this.optimizationStrategies.BATCH]: prices.batch
        };

        return strategyMap[strategy] || prices.standard;
    }

    /**
     * Estimate gas limit for transaction type
     */
    estimateGasLimit(transactionType, contractAddress = null) {
        const baseLimit = this.gasLimits[transactionType.toUpperCase()] || 100000;
        
        // Add buffer for complex contracts
        const buffer = contractAddress ? 1.2 : 1.1;
        
        return Math.floor(baseLimit * buffer);
    }

    /**
     * Calculate total transaction cost
     */
    async calculateTransactionCost(transactionType, network = 'ethereum', priority = 'standard') {
        try {
            const gasData = await this.getOptimizedGasPrice(network, priority);
            const gasLimit = this.estimateGasLimit(transactionType);
            
            const totalCost = gasData.gasPrice * BigInt(gasLimit);
            
            return {
                success: true,
                gasPrice: gasData.gasPrice,
                gasLimit,
                totalCost,
                costInEth: ethers.formatEther(totalCost),
                costInGwei: ethers.formatUnits(totalCost, 'gwei'),
                network,
                priority
            };

        } catch (error) {
            console.error('Cost calculation error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch transaction optimization
     */
    async queueForBatch(transaction) {
        this.batchQueue.push({
            ...transaction,
            queuedAt: new Date()
        });

        // Auto-process batch after delay or when queue is full
        if (this.batchQueue.length >= 10) {
            await this.processBatch();
        } else if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.processBatch(), 60000); // 1 minute
        }

        return {
            success: true,
            position: this.batchQueue.length,
            estimatedProcessing: this.batchTimer ? new Date(Date.now() + 60000) : 'Soon'
        };
    }

    /**
     * Process batched transactions
     */
    async processBatch() {
        if (this.batchQueue.length === 0) {return;}

        try {
            const transactions = [...this.batchQueue];
            this.batchQueue = [];
            
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
            }

            // Use slow gas price for batch
            const gasData = await this.getOptimizedGasPrice('ethereum', 'batch');
            
            console.log(`📦 Processing batch of ${transactions.length} transactions`);
            
            // Process transactions with optimized gas
            for (const tx of transactions) {
                await this.executeOptimizedTransaction(tx, gasData.gasPrice);
            }

            return { success: true, processed: transactions.length };

        } catch (error) {
            console.error('Batch processing error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute transaction with optimized gas
     */
    async executeOptimizedTransaction(transaction, gasPrice) {
        try {
            const provider = this.getProvider(transaction.network);
            const wallet = new ethers.Wallet(transaction.privateKey, provider);

            const txParams = {
                to: transaction.to,
                value: transaction.value || 0,
                data: transaction.data || '0x',
                gasPrice: gasPrice,
                gasLimit: transaction.gasLimit || this.estimateGasLimit(transaction.type),
                nonce: await wallet.getTransactionCount()
            };

            const tx = await wallet.sendTransaction(txParams);
            
            console.log(`✅ Transaction executed: ${tx.hash}`);
            
            return { success: true, hash: tx.hash, gasPrice };

        } catch (error) {
            console.error('Transaction execution error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Monitor gas price trends
     */
    async monitorGasPrices(network = 'ethereum', duration = 3600000) { // 1 hour
        const startTime = Date.now();
        const prices = [];
        
        const interval = setInterval(async () => {
            try {
                const gasData = await this.getOptimizedGasPrice(network);
                prices.push({
                    timestamp: new Date(),
                    price: gasData.gasPrice,
                    gwei: ethers.formatUnits(gasData.gasPrice, 'gwei')
                });

                if (Date.now() - startTime >= duration) {
                    clearInterval(interval);
                    this.analyzeGasTrends(prices);
                }
            } catch (error) {
                console.error('Gas monitoring error:', error);
            }
        }, 30000); // Check every 30 seconds

        return { success: true, monitoring: true };
    }

    /**
     * Analyze gas price trends
     */
    analyzeGasTrends(prices) {
        if (prices.length < 2) {return;}

        const first = parseFloat(prices[0].gwei);
        const last = parseFloat(prices[prices.length - 1].gwei);
        const change = ((last - first) / first) * 100;

        const trend = {
            direction: change > 5 ? 'rising' : change < -5 ? 'falling' : 'stable',
            change: change.toFixed(2),
            recommendation: this.getGasRecommendation(change),
            dataPoints: prices.length
        };

        console.log(`📊 Gas trend analysis: ${trend.direction} (${trend.change}%)`);
        console.log(`💡 Recommendation: ${trend.recommendation}`);

        return trend;
    }

    /**
     * Get gas usage recommendation
     */
    getGasRecommendation(change) {
        if (change > 10) {return 'Gas prices rising rapidly - consider waiting';}
        if (change > 5) {return 'Gas prices increasing - use fast priority if urgent';}
        if (change < -10) {return 'Gas prices falling - good time for transactions';}
        if (change < -5) {return 'Gas prices decreasing - consider standard priority';}
        return 'Gas prices stable - use standard priority';
    }

    /**
     * Get blockchain provider
     */
    getProvider(network) {
        const providers = {
            ethereum: new ethers.JsonRpcProvider(process.env.ETH_RPC_URL),
            polygon: new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL),
            bsc: new ethers.JsonRpcProvider(process.env.BSC_RPC_URL)
        };

        return providers[network.toLowerCase()] || providers.ethereum;
    }

    /**
     * Get fallback gas prices
     */
    getFallbackGasPrice(network) {
        const fallbacks = {
            ethereum: ethers.parseUnits('20', 'gwei'),
            polygon: ethers.parseUnits('30', 'gwei'),
            bsc: ethers.parseUnits('5', 'gwei')
        };

        const gasPrice = fallbacks[network.toLowerCase()] || fallbacks.ethereum;

        return {
            success: true,
            gasPrice,
            estimates: {
                slow: gasPrice * 80n / 100n,
                standard: gasPrice,
                fast: gasPrice * 120n / 100n
            },
            network,
            priority: 'fallback',
            timestamp: new Date()
        };
    }

    /**
     * Get current batch queue status
     */
    getBatchStatus() {
        return {
            queueLength: this.batchQueue.length,
            nextProcessing: this.batchTimer ? new Date(Date.now() + 60000) : null,
            oldestTransaction: this.batchQueue[0]?.queuedAt || null
        };
    }
}

// Create singleton instance
const gasOptimizationService = new GasOptimizationService();

module.exports = gasOptimizationService; 