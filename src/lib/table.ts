import Table from 'cli-table3';
import chalk from 'chalk';

/**
 * Render an array of objects as a formatted CLI table.
 */
export function renderTable(data: Record<string, unknown>[], columns?: string[]): void {
  if (!data || data.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  const keys = columns || Object.keys(data[0]);
  const table = new Table({
    head: keys.map((k) => chalk.cyan(k)),
    style: { head: [], border: ['grey'] },
    wordWrap: true,
  });

  for (const row of data) {
    table.push(keys.map((k) => String(row[k] ?? '')));
  }

  console.log(table.toString());
}

/**
 * Render a single object as a key-value table.
 */
export function renderDetail(obj: Record<string, unknown>): void {
  const table = new Table({ style: { border: ['grey'] } });
  for (const [key, val] of Object.entries(obj)) {
    table.push({ [chalk.cyan(key)]: String(val ?? '') });
  }
  console.log(table.toString());
}
