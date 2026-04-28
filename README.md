# Insighta Labs+ CLI

The global command-line interface for the Insighta Labs+ Profile Intelligence Platform.

## 🏗 System Architecture
The CLI is a standalone TypeScript application that communicates with the centralized Insighta Labs+ Backend API via REST. It utilizes a local credential store to maintain security across sessions.

## 🔐 Authentication Flow (PKCE)
This CLI implements a secure **GitHub OAuth with PKCE** flow:
1.  **Challenge**: Generates a `code_verifier` and `code_challenge`.
2.  **Authorize**: Opens the system browser to the Backend's GitHub redirect.
3.  **Local Callback**: Captures the OAuth code via a temporary local server (port 9876).
4.  **Token Exchange**: Exchanges the code + verifier for JWT tokens via the Backend.

## 🎫 Token Handling
- **Storage**: Tokens are stored at `~/.insighta/credentials.json` with `600` (user-only) permissions.
- **Auto-Refresh**: The CLI automatically uses the Refresh Token to get a new Access Token whenever it receives a `401 Unauthorized` response.

## 🚀 Installation

```bash
# Clone the repo and install globally
cd insighta-cli
npm install -g .
```

## 🛠 Usage

### Authentication
- `insighta login`: Authenticate via GitHub.
- `insighta whoami`: Show current session info.
- `insighta logout`: Revoke server-side tokens and clear local cache.

### Profile Operations
- `insighta profiles list`: List profiles with optional filters (`--gender`, `--country`, `--age-group`).
- `insighta profiles search "query"`: Natural language search (e.g., "young adults from nigeria").
- `insighta profiles get <id>`: View full profile details.
- `insighta profiles create --name "Name"`: Admin-only profile creation.
- `insighta profiles export --format csv`: Export filtered data to a CSV in your current directory.
