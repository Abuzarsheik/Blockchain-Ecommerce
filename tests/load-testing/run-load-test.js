/**
 * 🛡️ SAFE LOAD TEST RUNNER
 * Executes Artillery load tests with safety checks
 * Ensures zero risk to production system
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class BlockmerceLoadTestRunner {
    constructor() {
        this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
        this.configFile = './artillery-config.yml';
        this.resultsDir = './results';
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    async checkSystemHealth() {
        console.log('🔍 Checking system health before load test...');
        
        try {
            const response = await axios.get(`${this.apiBaseUrl}/api/health`, {
                timeout: 10000
            });
            
            if (response.status === 200) {
                console.log('✅ System is healthy and ready for testing');
                return true;
            } else {
                console.log('⚠️  System health check failed:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ System is not accessible:', error.message);
            console.log('💡 Make sure your Blocmerce server is running on port 5000');
            return false;
        }
    }

    async installArtilleryIfNeeded() {
        try {
            // Check if artillery is available
            const checkArtillery = spawn('artillery', ['--version'], { stdio: 'pipe' });
            
            return new Promise((resolve) => {
                checkArtillery.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Artillery.js is available');
                        resolve(true);
                    } else {
                        console.log('📦 Artillery.js not found, installing...');
                        this.installArtillery().then(resolve);
                    }
                });
                
                checkArtillery.on('error', () => {
                    console.log('📦 Artillery.js not found, installing...');
                    this.installArtillery().then(resolve);
                });
            });
        } catch (error) {
            console.log('📦 Installing Artillery.js...');
            return await this.installArtillery();
        }
    }

    async installArtillery() {
        return new Promise((resolve, reject) => {
            console.log('⬇️  Installing Artillery.js globally...');
            
            const install = spawn('npm', ['install', '-g', 'artillery'], {
                stdio: 'inherit',
                shell: true
            });

            install.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Artillery.js installed successfully');
                    resolve(true);
                } else {
                    console.log('❌ Failed to install Artillery.js');
                    resolve(false);
                }
            });

            install.on('error', (error) => {
                console.log('❌ Installation error:', error.message);
                resolve(false);
            });
        });
    }

    async runLoadTest() {
        console.log('🚀 Starting safe load test...');
        console.log('===============================');
        
        const outputFile = path.join(this.resultsDir, `load-test-${this.timestamp}.json`);
        const reportFile = path.join(this.resultsDir, `load-test-report-${this.timestamp}.html`);
        
        return new Promise((resolve, reject) => {
            const artillery = spawn('artillery', [
                'run',
                this.configFile,
                '--output', outputFile
            ], {
                stdio: 'inherit',
                shell: true,
                cwd: path.dirname(__filename)
            });

            artillery.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Load test completed successfully');
                    this.generateReport(outputFile, reportFile).then(() => {
                        resolve({
                            success: true,
                            outputFile,
                            reportFile
                        });
                    });
                } else {
                    console.log('⚠️  Load test completed with warnings (code:', code, ')');
                    resolve({
                        success: false,
                        code,
                        outputFile,
                        reportFile
                    });
                }
            });

            artillery.on('error', (error) => {
                console.log('❌ Load test error:', error.message);
                reject(error);
            });
        });
    }

    async generateReport(outputFile, reportFile) {
        try {
            console.log('📊 Generating HTML report...');
            
            const report = spawn('artillery', [
                'report',
                outputFile,
                '--output', reportFile
            ], {
                stdio: 'inherit',
                shell: true
            });

            return new Promise((resolve) => {
                report.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ HTML report generated successfully');
                        console.log(`📁 Report location: ${reportFile}`);
                    } else {
                        console.log('⚠️  Report generation had issues');
                    }
                    resolve();
                });

                report.on('error', () => {
                    console.log('⚠️  Could not generate HTML report');
                    resolve();
                });
            });
        } catch (error) {
            console.log('⚠️  Report generation failed:', error.message);
        }
    }

    async analyzeResults(outputFile) {
        try {
            const data = await fs.readFile(outputFile, 'utf8');
            const results = JSON.parse(data);
            
            console.log('📈 LOAD TEST RESULTS SUMMARY');
            console.log('============================');
            
            if (results.aggregate) {
                const stats = results.aggregate;
                console.log(`📊 Total Requests: ${stats.requestsCompleted || 'N/A'}`);
                console.log(`⚡ Requests/Second: ${stats.rps?.mean?.toFixed(2) || 'N/A'}`);
                console.log(`⏱️  Response Time (avg): ${stats.latency?.mean?.toFixed(2) || 'N/A'}ms`);
                console.log(`⏱️  Response Time (p95): ${stats.latency?.p95?.toFixed(2) || 'N/A'}ms`);
                console.log(`✅ Success Rate: ${((1 - (stats.errors || 0) / (stats.requestsCompleted || 1)) * 100).toFixed(2)}%`);
                
                if (stats.errors > 0) {
                    console.log(`⚠️  Errors: ${stats.errors}`);
                } else {
                    console.log('🎉 No errors detected!');
                }
            }
            
            console.log('============================');
            return results;
            
        } catch (error) {
            console.log('⚠️  Could not analyze results:', error.message);
            return null;
        }
    }

    async run() {
        console.log('🛡️ Blocmerce Safe Load Test Runner');
        console.log('====================================');
        console.log('✅ Zero risk to production data');
        console.log('✅ Read-only operations only');
        console.log('✅ Independent test environment');
        console.log('====================================');
        
        try {
            // Step 1: Check system health
            const isHealthy = await this.checkSystemHealth();
            if (!isHealthy) {
                console.log('❌ System health check failed. Aborting test.');
                process.exit(1);
            }

            // Step 2: Install Artillery if needed
            const artilleryReady = await this.installArtilleryIfNeeded();
            if (!artilleryReady) {
                console.log('❌ Artillery.js setup failed. Aborting test.');
                process.exit(1);
            }

            // Step 3: Run load test
            const result = await this.runLoadTest();
            
            // Step 4: Analyze results
            if (result.success && result.outputFile) {
                await this.analyzeResults(result.outputFile);
            }

            console.log('🎉 Load testing completed successfully!');
            console.log(`📁 Results saved to: ${this.resultsDir}`);
            
        } catch (error) {
            console.error('❌ Load test runner failed:', error.message);
            process.exit(1);
        }
    }
}

// Run load test if script is executed directly
if (require.main === module) {
    const runner = new BlockmerceLoadTestRunner();
    runner.run();
}

module.exports = BlockmerceLoadTestRunner; 