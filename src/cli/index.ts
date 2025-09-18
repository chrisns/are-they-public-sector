#!/usr/bin/env node

/**
 * CLI Entry Point for UK Public Sector Organisation Aggregator
 * Main command-line interface for running the aggregation process
 */

import { Command } from 'commander';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { performance } from 'perf_hooks';

// Import orchestrator and logger
import { createOrchestrator } from './orchestrator.js';
import { createLogger, LogLevel } from './logger.js';

// Package information
const PACKAGE_NAME = 'uk-public-sector-aggregator';
const PACKAGE_VERSION = '0.1.0';

/**
 * CLI options interface
 */
interface CliOptions {
  cache?: boolean;
  debug?: boolean;
  timeout?: number;
  output?: string;
  logFile?: string;
  quiet?: boolean;
  source?: string;
}

/**
 * Create and configure the CLI command
 */
function createCli(): Command {
  const program = new Command();

  program
    .name(PACKAGE_NAME)
    .description('Aggregate UK public sector organisation data from multiple sources')
    .version(PACKAGE_VERSION)
    .option('-c, --cache', 'Enable caching for development (speeds up repeated runs)', false)
    .option('-d, --debug', 'Enable debug mode with verbose logging', false)
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('-o, --output <path>', 'Output file path', 'dist/orgs.json')
    .option('-l, --log-file <path>', 'Log to file in addition to console')
    .option('-q, --quiet', 'Suppress all output except errors', false)
    .option('-s, --source <source>', 'Fetch specific source only (govuk, ons, nhs-provider-directory, defra-uk-air, police, fire, devolved-extra, colleges-uk, welsh-councils, scottish-councils, ni-health)')
    .action(async (options: CliOptions) => {
      await runAggregation(options);
    });

  // Add compile command (alias for default action)
  program
    .command('compile')
    .description('Compile aggregated data (same as running without command)')
    .option('-c, --cache', 'Enable caching for development', false)
    .option('-d, --debug', 'Enable debug mode', false)
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('-o, --output <path>', 'Output file path', 'dist/orgs.json')
    .option('-s, --source <source>', 'Fetch specific source only (govuk, ons, nhs-provider-directory, defra-uk-air, police, fire, devolved-extra, colleges-uk)')
    .action(async (options: CliOptions) => {
      await runAggregation(options);
    });

  // Add cache command for cache management
  program
    .command('cache')
    .description('Manage cache')
    .option('--clear', 'Clear all cached data')
    .action(async (options: { clear?: boolean }) => {
      if (options.clear) {
        await clearCache();
      } else {
        console.log('Use --clear to remove all cached data');
      }
    });

  return program;
}

/**
 * Clear cache directory
 */
async function clearCache(): Promise<void> {
  const logger = createLogger();
  const cacheDir = '.cache';
  
  try {
    if (existsSync(cacheDir)) {
      const { rmSync } = await import('fs');
      rmSync(cacheDir, { recursive: true, force: true });
      logger.success('Cache cleared successfully');
    } else {
      logger.info('No cache to clear');
    }
  } catch (error) {
    logger.error('Failed to clear cache', error);
    process.exit(1);
  }
}

/**
 * Run the aggregation process
 */
async function runAggregation(options: CliOptions): Promise<void> {
  const startTime = performance.now();

  // Configure logger
  const loggerConfig: Partial<import('./logger.js').LoggerConfig> = {
    debugMode: !!options.debug,
    level: options.quiet ? LogLevel.ERROR : (options.debug ? LogLevel.DEBUG : LogLevel.INFO),
    logToFile: !!options.logFile,
    showProgress: !options.quiet
  };
  
  if (options.logFile) {
    loggerConfig.logFilePath = options.logFile;
  }
  
  const logger = createLogger(loggerConfig);

  // ASCII art banner (only if not quiet)
  if (!options.quiet) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║        UK Public Sector Organisation Aggregator           ║
║                     Version ${PACKAGE_VERSION}                        ║
╚════════════════════════════════════════════════════════════╝
`);
  }

  try {
    // Parse timeout
    const timeoutStr = typeof options.timeout === 'string' ? options.timeout : '30000';
    const timeout = parseInt(timeoutStr, 10);
    if (isNaN(timeout) || timeout < 0) {
      throw new Error('Invalid timeout value');
    }

    // Ensure output directory exists
    const outputPath = options.output || 'dist/orgs.json';
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      logger.debug(`Creating output directory: ${outputDir}`);
      mkdirSync(outputDir, { recursive: true });
    }

    // Create orchestrator
    const orchestratorConfig: import('./orchestrator.js').OrchestratorConfig = {
      cacheEnabled: !!options.cache,
      debugMode: !!options.debug,
      timeout,
      outputPath,
      logger,
      source: options.source
    };
    
    if (options.source) {
      orchestratorConfig.source = options.source;
    }
    
    const orchestrator = createOrchestrator(orchestratorConfig);

    // Run aggregation
    logger.section('Starting Aggregation Process');
    
    const runOptions: Parameters<typeof orchestrator.run>[0] = {
      cache: !!options.cache,
      debug: !!options.debug,
      timeout,
      output: outputPath
    };

    if (options.source !== undefined) {
      runOptions.source = options.source;
    }

    const result = await orchestrator.run(runOptions);

    // Calculate duration
    const duration = (performance.now() - startTime) / 1000;

    // Final summary
    if (!options.quiet) {
      logger.section('Aggregation Complete');
      const totalRecords = result.metadata?.statistics?.totalOrganisations || result.organisations.length;

      // Check if we have partial failures
      const hasFailures = result.partialFailures && result.partialFailures.length > 0;

      if (hasFailures) {
        logger.error(`✗ Aggregation completed with failures`);
        logger.error(`  • ${result.partialFailures!.length} source(s) failed to fetch data`);
      } else {
        logger.success(`✓ Successfully aggregated ${totalRecords} organisations`);
      }

      logger.info('Summary:');
      logger.info(`  • Output: ${outputPath}`);
      logger.info(`  • Records collected: ${totalRecords}`);
      logger.info(`  • Sources: ${result.metadata?.sources?.length || 3} sources`);
      logger.info(`  • Duplicates merged: ${result.metadata?.statistics?.duplicatesFound || 0}`);
      logger.info(`  • Processing time: ${duration.toFixed(2)}s`);

      if (options.cache) {
        logger.info(`  • Cache: Enabled (use --cache to reuse)`);
      }
    }

    // Exit with error code if there were partial failures
    if (result.partialFailures && result.partialFailures.length > 0) {
      process.exit(1);  // Non-zero exit code for partial failures
    }

    // Success exit
    process.exit(0);
  } catch (error) {
    // Error handling
    logger.error('Aggregation failed', error);
    
    if (error instanceof Error) {
      if (options.debug) {
        // Show full stack trace in debug mode
        console.error('\nStack trace:');
        console.error(error.stack);
      } else {
        // Show concise error message
        console.error(`\nError: ${error.message}`);
        console.error('Run with --debug for more details');
      }
    }

    // Calculate duration even on error
    const duration = (performance.now() - startTime) / 1000;
    logger.error(`Failed after ${duration.toFixed(2)}s`);

    // Error exit
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error: Error) => {
  console.error('\n[FATAL] Uncaught exception:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('\n[FATAL] Unhandled promise rejection:');
  console.error('Reason:', reason);
  process.exit(1);
});

/**
 * Handle termination signals
 */
process.on('SIGINT', () => {
  console.log('\n\nAggregation interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\nAggregation terminated');
  process.exit(143);
});

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const program = createCli();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Failed to initialize CLI:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.ts') || process.argv[1] && process.argv[1].endsWith('index.js')) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
export { createCli, runAggregation };