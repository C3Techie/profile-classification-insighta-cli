import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { AxiosError } from 'axios';

import { createApiClient, getBackendUrl } from '../lib/api';
import { loadCredentials } from '../lib/credentials';
import { renderTable, renderDetail } from '../lib/table';

function requireAuth(): void {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run: insighta login'));
    process.exit(1);
  }
}

function handleError(err: unknown): void {
  if (err instanceof Error && 'response' in err) {
    const axiosErr = err as AxiosError<{ status: string; message: string }>;
    const msg = axiosErr.response?.data?.message || axiosErr.message;
    console.error(chalk.red(`Error: ${msg}`));
  } else {
    console.error(chalk.red(`Error: ${String(err)}`));
  }
  process.exit(1);
}

export function registerProfileCommands(program: Command): void {
  const profiles = program.command('profiles').description('Manage profiles');

  // ── list ──────────────────────────────────────────────────────────────────

  profiles
    .command('list')
    .description('List profiles with optional filters')
    .option('--gender <gender>', 'Filter by gender (male/female)')
    .option('--country <code>', 'Filter by country code (e.g. NG)')
    .option('--age-group <group>', 'Filter by age group (child/teenager/adult/senior)')
    .option('--min-age <n>', 'Minimum age', parseInt)
    .option('--max-age <n>', 'Maximum age', parseInt)
    .option('--sort-by <field>', 'Sort field (age|created_at|gender_probability)', 'created_at')
    .option('--order <dir>', 'Sort direction (asc|desc)', 'desc')
    .option('--page <n>', 'Page number', parseInt)
    .option('--limit <n>', 'Results per page', parseInt)
    .action(async (opts) => {
      requireAuth();
      const spinner = ora('Fetching profiles...').start();
      try {
        const api = createApiClient();
        const params: Record<string, unknown> = {};
        if (opts.gender) params.gender = opts.gender;
        if (opts.country) params.country_id = opts.country;
        if (opts.ageGroup) params.age_group = opts.ageGroup;
        if (opts.minAge) params.min_age = opts.minAge;
        if (opts.maxAge) params.max_age = opts.maxAge;
        if (opts.sortBy) params.sort_by = opts.sortBy;
        if (opts.order) params.order = opts.order;
        if (opts.page) params.page = opts.page;
        if (opts.limit) params.limit = opts.limit;

        const resp = await api.get('/api/profiles', { params });
        spinner.stop();

        const { data, page, limit, total, total_pages } = resp.data;
        console.log(chalk.dim(`Page ${page} of ${total_pages} | ${total} total results\n`));

        const display = (data as Record<string, unknown>[]).map((p) => ({
          id: (p.id as string).slice(0, 8) + '...',
          name: p.name,
          gender: p.gender,
          age: p.age,
          age_group: p.age_group,
          country: p.country_id,
          created_at: (p.created_at as string).slice(0, 10),
        }));
        renderTable(display);
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  // ── get ───────────────────────────────────────────────────────────────────

  profiles
    .command('get <id>')
    .description('Get a profile by ID')
    .action(async (id) => {
      requireAuth();
      const spinner = ora('Fetching profile...').start();
      try {
        const api = createApiClient();
        const resp = await api.get(`/api/profiles/${id}`);
        spinner.stop();
        renderDetail(resp.data.data as Record<string, unknown>);
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  // ── search ────────────────────────────────────────────────────────────────

  profiles
    .command('search <query>')
    .description('Natural language profile search')
    .option('--page <n>', 'Page number', parseInt)
    .option('--limit <n>', 'Results per page', parseInt)
    .action(async (query, opts) => {
      requireAuth();
      const spinner = ora('Searching...').start();
      try {
        const api = createApiClient();
        const params: Record<string, unknown> = { q: query };
        if (opts.page) params.page = opts.page;
        if (opts.limit) params.limit = opts.limit;

        const resp = await api.get('/api/profiles/search', { params });
        spinner.stop();

        const { data, total } = resp.data;
        console.log(chalk.dim(`${total} result(s) for: "${query}"\n`));

        const display = (data as Record<string, unknown>[]).map((p) => ({
          id: (p.id as string).slice(0, 8) + '...',
          name: p.name,
          gender: p.gender,
          age: p.age,
          age_group: p.age_group,
          country: p.country_id,
        }));
        renderTable(display);
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  // ── create ────────────────────────────────────────────────────────────────

  profiles
    .command('create')
    .description('Create a new profile (admin only)')
    .requiredOption('--name <name>', 'Profile name')
    .action(async (opts) => {
      requireAuth();
      const spinner = ora(`Creating profile for "${opts.name}"...`).start();
      try {
        const api = createApiClient();
        const resp = await api.post('/api/profiles', { name: opts.name });
        spinner.stop();
        console.log(chalk.green('Profile created:'));
        renderDetail(resp.data.data as Record<string, unknown>);
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });

  // ── export ────────────────────────────────────────────────────────────────

  profiles
    .command('export')
    .description('Export profiles as CSV')
    .requiredOption('--format <fmt>', 'Export format (csv)')
    .option('--gender <gender>', 'Filter by gender')
    .option('--country <code>', 'Filter by country code')
    .option('--age-group <group>', 'Filter by age group')
    .option('--min-age <n>', 'Minimum age', parseInt)
    .option('--max-age <n>', 'Maximum age', parseInt)
    .action(async (opts) => {
      requireAuth();
      if (opts.format !== 'csv') {
        console.error(chalk.red('Only --format csv is supported.'));
        process.exit(1);
      }

      const spinner = ora('Exporting profiles...').start();
      try {
        const api = createApiClient();
        const params: Record<string, unknown> = { format: 'csv' };
        if (opts.gender) params.gender = opts.gender;
        if (opts.country) params.country_id = opts.country;
        if (opts.ageGroup) params.age_group = opts.ageGroup;
        if (opts.minAge) params.min_age = opts.minAge;
        if (opts.maxAge) params.max_age = opts.maxAge;

        const resp = await api.get('/api/profiles/export', {
          params,
          responseType: 'text',
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `profiles_${timestamp}.csv`;
        const dest = path.join(process.cwd(), filename);
        fs.writeFileSync(dest, resp.data as string, 'utf-8');

        spinner.succeed(chalk.green(`Exported to: ${dest}`));
      } catch (err) {
        spinner.stop();
        handleError(err);
      }
    });
}
