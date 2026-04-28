import http from 'http';
import { URL } from 'url';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { Command } from 'commander';

import { generateState, generateCodeVerifier, generateCodeChallenge } from '../lib/pkce';
import { saveCredentials, loadCredentials, clearCredentials } from '../lib/credentials';
import { createApiClient, resetApiClient } from '../lib/api';
import { renderDetail } from '../lib/table';

const CLI_CALLBACK_PORT = 9876;
const CLI_REDIRECT_URI = `http://localhost:${CLI_CALLBACK_PORT}/callback`;

// ── login ──────────────────────────────────────────────────────────────────────

export function registerAuthCommands(program: Command): void {
  program
    .command('login')
    .description('Authenticate with GitHub OAuth (PKCE)')
    .option('--backend <url>', 'Backend API URL (overrides default)')
    .action(async (opts) => {
      const backendUrl = opts.backend || process.env.INSIGHTA_API_URL || 'https://profile-classification-api.vercel.app';

      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const spinner = ora('Starting GitHub OAuth flow...').start();

      // Build the URL to open in the browser
      const authUrl = new URL(`${backendUrl}/auth/github`);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('redirect_uri', CLI_REDIRECT_URI);

      spinner.text = 'Opening browser...';

      // Start local callback server
      const tokenPromise = new Promise<{ access_token: string; refresh_token: string; username: string; role: string }>(
        (resolve, reject) => {
          const server = http.createServer(async (req, res) => {
            const reqUrl = new URL(req.url || '/', `http://localhost:${CLI_CALLBACK_PORT}`);

            if (reqUrl.pathname !== '/callback') {
              res.writeHead(404);
              res.end('Not found');
              return;
            }

            const receivedState = reqUrl.searchParams.get('state');
            const code = reqUrl.searchParams.get('code');
            const error = reqUrl.searchParams.get('error');

            if (error) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h2>Authentication failed. You can close this tab.</h2></body></html>');
              server.close();
              reject(new Error(`GitHub OAuth error: ${error}`));
              return;
            }

            if (receivedState !== state) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<html><body><h2>Invalid state. Please try again.</h2></body></html>');
              server.close();
              reject(new Error('State mismatch — possible CSRF'));
              return;
            }

            // Send code + code_verifier to backend
            try {
              const response = await axios.post(`${backendUrl}/auth/github/callback`, {
                code,
                code_verifier: codeVerifier,
                redirect_uri: CLI_REDIRECT_URI,
                state,
              });

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(
                `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
                  <h2>Login successful!</h2>
                  <p>Welcome, <strong>@${response.data.username}</strong>.</p>
                  <p>You can close this tab and return to your terminal.</p>
                </body></html>`
              );
              server.close();
              resolve(response.data);
            } catch (err: unknown) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end('<html><body><h2>Token exchange failed. Please try again.</h2></body></html>');
              server.close();
              reject(err);
            }
          });

          server.listen(CLI_CALLBACK_PORT, () => {
            // Open browser after server is ready
            open(authUrl.toString()).catch(() => {
              console.log(chalk.yellow(`\nOpen this URL in your browser:\n${authUrl.toString()}`));
            });
          });

          // Timeout after 3 minutes
          setTimeout(() => {
            server.close();
            reject(new Error('Login timed out after 3 minutes.'));
          }, 3 * 60 * 1000);
        }
      );

      try {
        const tokens = await tokenPromise;
        saveCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          username: tokens.username,
          role: tokens.role,
          backend_url: backendUrl,
        });
        resetApiClient();
        spinner.succeed(chalk.green(`Logged in as @${tokens.username} (role: ${tokens.role})`));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        spinner.fail(chalk.red(`Login failed: ${msg}`));
        process.exit(1);
      }
    });

  // ── logout ─────────────────────────────────────────────────────────────────

  program
    .command('logout')
    .description('Revoke session and clear stored credentials')
    .action(async () => {
      const creds = loadCredentials();
      const spinner = ora('Logging out...').start();

      if (creds?.refresh_token) {
        try {
          const api = createApiClient();
          await api.post('/auth/logout', { refresh_token: creds.refresh_token });
        } catch {
          // Best-effort server revocation
        }
      }

      clearCredentials();
      resetApiClient();
      spinner.succeed(chalk.green('Logged out successfully.'));
    });

  // ── whoami ─────────────────────────────────────────────────────────────────

  program
    .command('whoami')
    .description('Show currently authenticated user')
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) {
        console.log(chalk.yellow('Not logged in. Run: insighta login'));
        return;
      }

      const spinner = ora('Fetching user info...').start();
      try {
        const api = createApiClient();
        const resp = await api.get('/auth/me');
        spinner.stop();
        renderDetail(resp.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        spinner.fail(chalk.red(`Failed: ${msg}`));
      }
    });
}
