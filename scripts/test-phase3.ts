/**
 * Test Runner Script for Phase 3 SSO Authentication
 * Comprehensive test execution and validation
 *
 * File: scripts/test-phase3.ts
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

// Test configuration
const testConfig = {
    unitTests: {
        name: 'Unit Tests',
        command: 'npx vitest run src/components/auth/__tests__',
        timeout: 30000,
        required: true
    },
    integrationTests: {
        name: 'Integration Tests',
        command: 'npx vitest run src/__tests__/integration',
        timeout: 45000,
        required: true
    },
    e2eTests: {
        name: 'End-to-End Tests',
        command: 'npx vitest run src/__tests__/e2e',
        timeout: 60000,
        required: true
    },
    utilityTests: {
        name: 'Utility Tests',
        command: 'npx vitest run src/components/auth/__tests__/utils.test.ts',
        timeout: 15000,
        required: true
    },
    coverage: {
        name: 'Coverage Report',
        command: 'npx vitest run --coverage src/components/auth src/__tests__',
        timeout: 60000,
        required: false
    }
};

// Test results interface
interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    output: string;
    error?: string;
    coverage?: CoverageResult;
}

interface CoverageResult {
    functions: number;
    lines: number;
    branches: number;
    statements: number;
}

// Test runner class
class Phase3TestRunner {
    private results: TestResult[] = [];
    private startTime: number = 0;
    private totalTests: number = 0;
    private passedTests: number = 0;

    constructor() {
        this.startTime = Date.now();
    }

    // Log with colors
    private log(message: string, color: string = colors.reset): void {
        console.log(`${color}${message}${colors.reset}`);
    }

    // Log header
    private logHeader(): void {
        this.log('='.repeat(60), colors.cyan);
        this.log('🚀 PHASE 3 SSO AUTHENTICATION TEST RUNNER', colors.bold + colors.cyan);
        this.log('='.repeat(60), colors.cyan);
        this.log(`Started at: ${new Date().toISOString()}`, colors.white);
        this.log('');
    }

    // Log footer
    private logFooter(): void {
        const duration = (Date.now() - this.startTime) / 1000;
        const passed = this.passedTests === this.totalTests;

        this.log('');
        this.log('='.repeat(60), colors.cyan);
        this.log('📊 TEST SUMMARY', colors.bold + colors.cyan);
        this.log('='.repeat(60), colors.cyan);
        this.log(`Total Tests: ${this.totalTests}`, colors.white);
        this.log(`Passed: ${this.passedTests}`, passed ? colors.green : colors.yellow);
        this.log(`Failed: ${this.totalTests - this.passedTests}`, this.totalTests - this.passedTests === 0 ? colors.green : colors.red);
        this.log(`Duration: ${duration.toFixed(2)}s`, colors.white);
        this.log('');

        if (passed) {
            this.log('✅ ALL TESTS PASSED! Phase 3 is ready for Phase 4.', colors.bold + colors.green);
        } else {
            this.log('❌ SOME TESTS FAILED! Please review and fix before proceeding.', colors.bold + colors.red);
        }

        this.log('='.repeat(60), colors.cyan);
    }

    // Run individual test
    private async runTest(testName: string, config: any): Promise<TestResult> {
        this.log(`📋 Running ${config.name}...`, colors.yellow);

        const testStart = Date.now();
        let result: TestResult;

        try {
            const output = execSync(config.command, {
                encoding: 'utf8',
                timeout: config.timeout,
                cwd: process.cwd()
            });

            const duration = (Date.now() - testStart) / 1000;

            result = {
                name: config.name,
                passed: true,
                duration,
                output: output.toString()
            };

            this.log(`✅ ${config.name} passed (${duration.toFixed(2)}s)`, colors.green);

            // Extract coverage if available
            if (testName === 'coverage') {
                result.coverage = this.parseCoverage(output.toString());
            }

        } catch (error: any) {
            const duration = (Date.now() - testStart) / 1000;

            result = {
                name: config.name,
                passed: false,
                duration,
                output: error.stdout || '',
                error: error.stderr || error.message
            };

            this.log(`❌ ${config.name} failed (${duration.toFixed(2)}s)`, colors.red);

            if (config.required) {
                this.log(`   Error: ${error.message}`, colors.red);
            }
        }

        return result;
    }

    // Parse coverage from output
    private parseCoverage(output: string): CoverageResult {
        // This is a simplified parser - in reality, you'd parse the actual coverage output
        const defaultCoverage: CoverageResult = {
            functions: 0,
            lines: 0,
            branches: 0,
            statements: 0
        };

        try {
            // Look for coverage patterns in output
            const functionMatch = output.match(/Functions:\s*(\d+\.?\d*)%/);
            const lineMatch = output.match(/Lines:\s*(\d+\.?\d*)%/);
            const branchMatch = output.match(/Branches:\s*(\d+\.?\d*)%/);
            const statementMatch = output.match(/Statements:\s*(\d+\.?\d*)%/);

            return {
                functions: functionMatch ? parseFloat(functionMatch[1]) : defaultCoverage.functions,
                lines: lineMatch ? parseFloat(lineMatch[1]) : defaultCoverage.lines,
                branches: branchMatch ? parseFloat(branchMatch[1]) : defaultCoverage.branches,
                statements: statementMatch ? parseFloat(statementMatch[1]) : defaultCoverage.statements
            };
        } catch (error) {
            return defaultCoverage;
        }
    }

    // Check prerequisites
    private checkPrerequisites(): boolean {
        this.log('🔍 Checking prerequisites...', colors.blue);

        const checks = [
            {
                name: 'Node.js version',
                check: () => {
                    const version = process.version;
                    const major = parseInt(version.slice(1).split('.')[0]);
                    return major >= 18;
                },
                message: 'Node.js 18+ is required'
            },
            {
                name: 'Package.json exists',
                check: () => {
                    try {
                        readFileSync(join(process.cwd(), 'package.json'), 'utf8');
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: 'package.json not found'
            },
            {
                name: 'Vitest installed',
                check: () => {
                    try {
                        execSync('npx vitest --version', { stdio: 'ignore' });
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: 'Vitest not installed. Run: npm install --save-dev vitest'
            },
            {
                name: 'Test files exist',
                check: () => {
                    const testFiles = [
                        'src/components/auth/__tests__/SSOProvider.test.tsx',
                        'src/components/auth/__tests__/SSOLogin.test.tsx',
                        'src/components/auth/__tests__/utils.test.ts'
                    ];

                    return testFiles.some(file => {
                        try {
                            readFileSync(join(process.cwd(), file), 'utf8');
                            return true;
                        } catch {
                            return false;
                        }
                    });
                },
                message: 'Test files not found. Please create test files first.'
            }
        ];

        let allPassed = true;

        for (const check of checks) {
            if (check.check()) {
                this.log(`  ✅ ${check.name}`, colors.green);
            } else {
                this.log(`  ❌ ${check.name}: ${check.message}`, colors.red);
                allPassed = false;
            }
        }

        return allPassed;
    }

    // Generate test report
    private generateReport(): void {
        this.log('📝 Generating test report...', colors.blue);

        const report = {
            timestamp: new Date().toISOString(),
            phase: 'Phase 3 - SSO Authentication',
            duration: (Date.now() - this.startTime) / 1000,
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.totalTests - this.passedTests,
                success: this.passedTests === this.totalTests
            },
            tests: this.results.map(result => ({
                name: result.name,
                passed: result.passed,
                duration: result.duration,
                coverage: result.coverage
            })),
            recommendations: this.generateRecommendations()
        };

        try {
            writeFileSync(
                join(process.cwd(), 'test-report-phase3.json'),
                JSON.stringify(report, null, 2)
            );
            this.log('  ✅ Test report saved to test-report-phase3.json', colors.green);
        } catch (error) {
            this.log('  ❌ Failed to save test report', colors.red);
        }
    }

    // Generate recommendations
    private generateRecommendations(): string[] {
        const recommendations: string[] = [];

        const failedTests = this.results.filter(r => !r.passed);
        if (failedTests.length > 0) {
            recommendations.push('Fix failing tests before proceeding to Phase 4');
            failedTests.forEach(test => {
                recommendations.push(`- Review ${test.name} test failures`);
            });
        }

        const coverageResult = this.results.find(r => r.coverage);
        if (coverageResult?.coverage) {
            const coverage = coverageResult.coverage;
            if (coverage.functions < 90) {
                recommendations.push('Improve function coverage (target: 90%+)');
            }
            if (coverage.lines < 90) {
                recommendations.push('Improve line coverage (target: 90%+)');
            }
            if (coverage.branches < 85) {
                recommendations.push('Improve branch coverage (target: 85%+)');
            }
        }

        if (recommendations.length === 0) {
            recommendations.push('All tests passed! Ready to proceed to Phase 4.');
        }

        return recommendations;
    }

    // Main test execution
    async run(): Promise<void> {
        this.logHeader();

        // Check prerequisites
        if (!this.checkPrerequisites()) {
            this.log('❌ Prerequisites not met. Please fix the issues above.', colors.red);
            process.exit(1);
        }

        this.log('✅ Prerequisites check passed', colors.green);
        this.log('');

        // Run tests
        this.totalTests = Object.keys(testConfig).length;

        for (const [testName, config] of Object.entries(testConfig)) {
            const result = await this.runTest(testName, config);
            this.results.push(result);

            if (result.passed) {
                this.passedTests++;
            }

            // Stop on critical failure
            if (!result.passed && config.required) {
                this.log('');
                this.log('❌ Critical test failed. Stopping execution.', colors.red);
                break;
            }
        }

        // Generate report
        this.generateReport();

        // Log summary
        this.logFooter();

        // Exit with appropriate code
        process.exit(this.passedTests === this.totalTests ? 0 : 1);
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new Phase3TestRunner();
    runner.run().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

export default Phase3TestRunner;