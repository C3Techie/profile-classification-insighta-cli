#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { registerAuthCommands } from './commands/auth';
import { registerProfileCommands } from './commands/profiles';

const program = new Command();

program
  .name('insighta')
  .description('Insighta Labs+ CLI — Profile Intelligence Platform')
  .version('1.0.0');

registerAuthCommands(program);
registerProfileCommands(program);

// Global error handler
program.exitOverride();

try {
  program.parse(process.argv);
} catch (err: unknown) {
  if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'commander.unknownCommand') {
    console.error(chalk.red(`Unknown command. Run: insighta --help`));
    process.exit(1);
  }
}
