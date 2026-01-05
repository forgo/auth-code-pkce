#!/usr/bin/env node

/**
 * Generate compatibility matrix HTML page from E2E test results.
 *
 * Usage (provider compliance tests):
 *   node scripts/generate-compatibility-matrix.js \
 *     --keycloak-v24=pass \
 *     --keycloak-v25=pass \
 *     --keycloak-v26=pass \
 *     --authentik-v2024-8=pass \
 *     --authentik-v2024-12=pass \
 *     --authentik-v2025-6=pass
 *
 * Usage (framework integration tests):
 *   node scripts/generate-compatibility-matrix.js \
 *     --react-keycloak-v24=pass \
 *     --react-keycloak-v25=pass \
 *     --react-keycloak-v26=pass \
 *     --vue-keycloak-v24=pass \
 *     ... (18 combinations total)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, 'compatibility-site');

// Parse command line arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

// Provider configuration
const providers = [
  {
    name: 'Keycloak',
    versions: [
      { id: 'keycloak-v24', version: '24.0.5', image: 'quay.io/keycloak/keycloak:24.0.5' },
      { id: 'keycloak-v25', version: '25.0.6', image: 'quay.io/keycloak/keycloak:25.0.6' },
      { id: 'keycloak-v26', version: '26.0.7', image: 'quay.io/keycloak/keycloak:26.0.7' },
    ],
  },
  {
    name: 'Authentik',
    versions: [
      {
        id: 'authentik-v2024-8',
        version: '2024.8.3',
        image: 'ghcr.io/goauthentik/server:2024.8.3',
      },
      {
        id: 'authentik-v2024-12',
        version: '2024.12.2',
        image: 'ghcr.io/goauthentik/server:2024.12.2',
      },
      {
        id: 'authentik-v2025-6',
        version: '2025.6.1',
        image: 'ghcr.io/goauthentik/server:2025.6.1',
      },
    ],
  },
];

// Framework configuration
const frameworks = [
  { id: 'react', name: 'React', package: '@auth-code-pkce/react' },
  { id: 'vue', name: 'Vue', package: '@auth-code-pkce/vue' },
  { id: 'svelte', name: 'Svelte', package: '@auth-code-pkce/svelte' },
];

// All provider versions for framework matrix
const allProviderVersions = [
  { id: 'keycloak-v24', label: 'KC 24', provider: 'Keycloak', version: '24' },
  { id: 'keycloak-v25', label: 'KC 25', provider: 'Keycloak', version: '25' },
  { id: 'keycloak-v26', label: 'KC 26', provider: 'Keycloak', version: '26' },
  { id: 'authentik-v2024-8', label: 'AK 2024.8', provider: 'Authentik', version: '2024.8' },
  { id: 'authentik-v2024-12', label: 'AK 2024.12', provider: 'Authentik', version: '2024.12' },
  { id: 'authentik-v2025-6', label: 'AK 2025.6', provider: 'Authentik', version: '2025.6' },
];

function getStatusIcon(status) {
  switch (status) {
    case 'pass':
      return '<span class="status pass">PASS</span>';
    case 'fail':
      return '<span class="status fail">FAIL</span>';
    default:
      return '<span class="status unknown">?</span>';
  }
}

function generateFrameworkMatrixHTML(results) {
  // Generate framework × provider matrix table
  const headerCells = allProviderVersions.map((v) => `<th>${v.label}</th>`).join('');

  const rows = frameworks.map((framework) => {
    const cells = allProviderVersions.map((v) => {
      const key = `${framework.id}-${v.id}`;
      const status = results[key] || 'unknown';
      return `<td>${getStatusIcon(status)}</td>`;
    }).join('');
    return `
      <tr>
        <td><strong>${framework.name}</strong><br><code>${framework.package}</code></td>
        ${cells}
      </tr>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-header">Framework Integration Tests</div>
      <div class="matrix-description">
        Tests the actual <code>@auth-code-pkce/*</code> packages in real applications
      </div>
      <table class="framework-matrix">
        <thead>
          <tr>
            <th>Framework</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function generateHTML(results) {
  const timestamp = new Date().toISOString();

  // Check if we have framework results
  const hasFrameworkResults = frameworks.some((framework) =>
    allProviderVersions.some((v) => results[`${framework.id}-${v.id}`])
  );

  const rows = providers.flatMap((provider) =>
    provider.versions.map((v) => {
      const status = results[v.id] || 'unknown';
      return `
        <tr>
          <td>${provider.name}</td>
          <td>${v.version}</td>
          <td><code>${v.image}</code></td>
          <td>${getStatusIcon(status)}</td>
        </tr>`;
    })
  );

  const frameworkSection = hasFrameworkResults ? generateFrameworkMatrixHTML(results) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OAuth PKCE Library - Provider Compatibility</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --pass: #238636;
      --fail: #da3633;
      --unknown: #848d97;
      --accent: #58a6ff;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
      color: var(--text);
    }

    .subtitle {
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 2rem;
    }

    .card-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      background: var(--surface);
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.875rem;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .status {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .status.pass {
      background: rgba(35, 134, 54, 0.2);
      color: #3fb950;
    }

    .status.fail {
      background: rgba(218, 54, 51, 0.2);
      color: #f85149;
    }

    .status.unknown {
      background: rgba(132, 141, 151, 0.2);
      color: var(--unknown);
    }

    .footer {
      color: var(--text-muted);
      font-size: 0.875rem;
      text-align: center;
    }

    .footer a {
      color: var(--accent);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .timestamp {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
    }

    .matrix-description {
      padding: 0.75rem 1.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--border);
    }

    .framework-matrix th {
      font-size: 0.75rem;
      text-align: center;
      white-space: nowrap;
    }

    .framework-matrix td {
      text-align: center;
    }

    .framework-matrix td:first-child {
      text-align: left;
    }

    .section-divider {
      margin: 2rem 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>OAuth PKCE Library</h1>
    <p class="subtitle">Provider Compatibility Matrix</p>

    ${frameworkSection}

    ${hasFrameworkResults ? '<div class="section-divider">Provider Compliance Tests (direct API testing)</div>' : ''}

    <div class="card">
      <div class="card-header">Identity Provider Support</div>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Version</th>
            <th>Docker Image</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>
        Tested nightly via
        <a href="https://github.com/anthropics/auth-code-pkce/actions" target="_blank">GitHub Actions</a>
      </p>
      <p class="timestamp">Last updated: ${timestamp}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateResultsJSON(results) {
  const timestamp = new Date().toISOString();

  // Framework integration results
  const frameworkResults = frameworks.map((framework) => ({
    framework: framework.name,
    package: framework.package,
    providers: allProviderVersions.map((v) => ({
      provider: v.provider,
      version: v.version,
      status: results[`${framework.id}-${v.id}`] || 'unknown',
    })),
  }));

  return JSON.stringify(
    {
      timestamp,
      // Framework integration tests (the main compatibility matrix)
      frameworks: frameworkResults,
      // Provider compliance tests
      providers: providers.map((provider) => ({
        name: provider.name,
        versions: provider.versions.map((v) => ({
          version: v.version,
          image: v.image,
          status: results[v.id] || 'unknown',
        })),
      })),
    },
    null,
    2
  );
}

function main() {
  const args = parseArgs();

  // Map args to results
  const results = {};

  // Provider compliance test results
  providers.forEach((provider) => {
    provider.versions.forEach((v) => {
      const argKey = v.id;
      results[v.id] = args[argKey] || 'unknown';
    });
  });

  // Framework integration test results
  frameworks.forEach((framework) => {
    allProviderVersions.forEach((v) => {
      const argKey = `${framework.id}-${v.id}`;
      if (args[argKey]) {
        results[argKey] = args[argKey];
      }
    });
  });

  // Create output directory
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'data'), { recursive: true });

  // Write HTML
  writeFileSync(join(outputDir, 'index.html'), generateHTML(results));
  console.log('Generated: compatibility-site/index.html');

  // Write JSON results
  writeFileSync(join(outputDir, 'data', 'results.json'), generateResultsJSON(results));
  console.log('Generated: compatibility-site/data/results.json');
}

main();
