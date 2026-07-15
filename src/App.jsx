import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_URLS = {
  testops: 'https://testops.katalon.io',
  studio: 'http://127.0.0.1:33699',
  jira: '',
  azureDevOps: '',
}

const CATEGORY_ORDER = [
  'Terminal / CLI',
  'Chat assistant',
  'IDE',
  'IDE extension',
  'Cloud IDE',
  'API client (extra)',
]

// The 36 clients listed at https://katalon.com/katalon-mcp, plus Bruno
// (added separately since it isn't in Katalon's catalog but is still a
// useful way to poke at an MCP server directly). Each entry's `kind`
// selects which generator function handles it in handleGenerate, and
// `targetFile` is shown in the "Selected format" hint and used as the
// default install-instructions target when a client doesn't have its own
// hand-written entry in INSTALLATION_INSTRUCTIONS.
//
// `unpublished: true` means Katalon's own catalog page didn't show a
// copy-paste snippet for this client (no "Install" snippet block) — the
// generated output is a best-effort generic MCP config, and the person
// should confirm exact key names/paths against that client's own docs.
const CLIENTS = [
  // Terminal / CLI
  {
    id: 'claude-code',
    label: 'Claude Code',
    category: 'Terminal / CLI',
    kind: 'cli',
    cli: (name, url) => `claude mcp add --transport http ${name} ${url}`,
    targetFile: "Terminal command — Claude Code writes its own MCP config automatically",
  },
  { id: 'codex', label: 'Codex', category: 'Terminal / CLI', kind: 'codex', targetFile: '~/.codex/config.toml' },
  {
    id: 'gemini-cli',
    label: 'Gemini CLI',
    category: 'Terminal / CLI',
    kind: 'cli',
    cli: (name, url) => `gemini mcp add --transport http ${name} ${url}`,
    targetFile: "Terminal command — Gemini CLI writes its own MCP config automatically",
  },
  {
    id: 'github-copilot-cli',
    label: 'GitHub Copilot CLI',
    category: 'Terminal / CLI',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: "GitHub Copilot CLI's MCP config (exact file path not published by Katalon)",
  },
  {
    id: 'amazon-q-cli',
    label: 'Amazon Q Developer CLI',
    category: 'Terminal / CLI',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: '~/.aws/amazonq/agents/default.json (confirm current path in Amazon Q docs)',
  },
  {
    id: 'warp',
    label: 'Warp',
    category: 'Terminal / CLI',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: 'Warp → Settings → AI → Manage MCP servers (backing config file managed by Warp)',
  },
  {
    id: 'openhands',
    label: 'OpenHands',
    category: 'Terminal / CLI',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: "OpenHands' MCP config (exact file path not published by Katalon)",
  },
  {
    id: 'goose',
    label: 'Goose',
    category: 'Terminal / CLI',
    kind: 'mcp-remote-bridge',
    unpublished: true,
    targetFile: '~/.config/goose/config.yaml (Goose uses YAML — translate the JSON block into its "extensions" format)',
  },
  {
    id: 'opencode',
    label: 'opencode',
    category: 'Terminal / CLI',
    kind: 'json-mcp-type-remote',
    targetFile: 'opencode.json (project root) or your global opencode config',
  },
  {
    id: 'grok-build-cli',
    label: 'Grok Build CLI',
    category: 'Terminal / CLI',
    kind: 'mcp-remote-bridge',
    unpublished: true,
    targetFile: "Grok Build CLI's MCP config (exact file path not published by Katalon)",
  },

  // Chat assistant
  { id: 'claude', label: 'Claude Desktop', category: 'Chat assistant', kind: 'claude', targetFile: 'claude_desktop_config.json' },
  {
    id: 'claude-web',
    label: 'Claude.ai (web)',
    category: 'Chat assistant',
    kind: 'ui-connector',
    targetFile: 'Claude.ai → Settings → Connectors (browser UI, no file)',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    category: 'Chat assistant',
    kind: 'ui-connector',
    targetFile: 'ChatGPT → Settings → Connectors → Developer mode (browser UI, no file)',
  },
  {
    id: 'mistral-le-chat',
    label: 'Mistral Le Chat',
    category: 'Chat assistant',
    kind: 'ui-connector',
    targetFile: 'Le Chat → Settings → Connectors (browser UI, no file)',
  },
  {
    id: 'ms-copilot-studio',
    label: 'Microsoft Copilot Studio',
    category: 'Chat assistant',
    kind: 'ui-connector',
    targetFile: "Copilot Studio's MCP server wizard (no file)",
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    category: 'Chat assistant',
    kind: 'ui-connector',
    targetFile: 'Perplexity → Settings → Connectors (no file)',
  },

  // IDE
  {
    id: 'cursor',
    label: 'Cursor',
    category: 'IDE',
    kind: 'json-mcpServers-url',
    targetFile: '~/.cursor/mcp.json (global) or <project>/.cursor/mcp.json (project-scoped)',
  },
  { id: 'vscode', label: 'VS Code (Copilot)', category: 'IDE', kind: 'vscode', targetFile: '.vscode/mcp.json' },
  {
    id: 'windsurf',
    label: 'Windsurf',
    category: 'IDE',
    kind: 'json-mcpServers-serverUrl',
    targetFile:
      '~/.codeium/windsurf/mcp_config.json (macOS/Linux) or %USERPROFILE%\\.codeium\\windsurf\\mcp_config.json (Windows)',
  },
  {
    id: 'zed',
    label: 'Zed',
    category: 'IDE',
    kind: 'json-context_servers-url',
    targetFile: 'the "context_servers" block inside Zed\'s settings.json',
  },
  {
    id: 'jetbrains-junie',
    label: 'JetBrains AI / Junie',
    category: 'IDE',
    kind: 'json-mcpServers-url',
    targetFile: '.junie/mcp/mcp.json (project) or ~/.junie/mcp/mcp.json (user)',
  },
  {
    id: 'kiro',
    label: 'Kiro',
    category: 'IDE',
    kind: 'json-mcpServers-url',
    targetFile: 'Kiro → MCP Servers panel (backing .kiro/settings/mcp.json)',
  },
  {
    id: 'android-studio',
    label: 'Android Studio (Gemini)',
    category: 'IDE',
    kind: 'json-mcpServers-httpUrl',
    targetFile: 'Android Studio → Settings → Gemini → MCP Servers (backing mcp.json)',
  },
  {
    id: 'xcode',
    label: 'Xcode 26',
    category: 'IDE',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: "Xcode's Claude Agent MCP config (exact file path not published by Katalon)",
  },
  {
    id: 'trae',
    label: 'Trae',
    category: 'IDE',
    kind: 'mcp-remote-bridge',
    targetFile: 'Trae → Add MCP manually (JSON config panel)',
  },
  {
    id: 'google-antigravity',
    label: 'Google Antigravity',
    category: 'IDE',
    kind: 'mcp-remote-bridge',
    targetFile: "Google Antigravity's MCP config panel",
  },

  // IDE extension
  {
    id: 'cline',
    label: 'Cline',
    category: 'IDE extension',
    kind: 'mcp-remote-bridge',
    targetFile: "cline_mcp_settings.json under VS Code's global storage for the Cline extension",
  },
  {
    id: 'continue',
    label: 'Continue',
    category: 'IDE extension',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: '.continue/mcpServers/ or config.yaml (confirm current format in Continue docs)',
  },
  {
    id: 'roo-code',
    label: 'Roo Code',
    category: 'IDE extension',
    kind: 'mcp-remote-bridge',
    targetFile: "cline_mcp_settings.json under VS Code's global storage for the Roo Code extension",
  },
  {
    id: 'augment-code',
    label: 'Augment Code',
    category: 'IDE extension',
    kind: 'mcp-remote-bridge',
    targetFile: 'Augment Code → Settings → Tools → + Add MCP (JSON config panel)',
  },
  {
    id: 'factory-droid',
    label: 'Factory Droid',
    category: 'IDE extension',
    kind: 'cli',
    cli: (name, url) => `droid mcp add ${name} ${url} --type http`,
    targetFile: 'Terminal command — Factory Droid writes its own MCP config automatically',
  },
  {
    id: 'sourcegraph-amp',
    label: 'Sourcegraph Amp',
    category: 'IDE extension',
    kind: 'cli',
    cli: (name, url) => `amp mcp add ${name} ${url}`,
    targetFile: 'Terminal command — Sourcegraph Amp writes its own MCP config automatically',
  },
  {
    id: 'firebender',
    label: 'Firebender',
    category: 'IDE extension',
    kind: 'json-mcpServers-url',
    targetFile: '.firebender/mcp.json',
  },
  {
    id: 'tabnine',
    label: 'Tabnine',
    category: 'IDE extension',
    kind: 'json-mcpServers-url',
    unpublished: true,
    targetFile: "Tabnine's MCP settings (exact file path not published by Katalon)",
  },
  {
    id: 'qodo-gen',
    label: 'Qodo Gen',
    category: 'IDE extension',
    kind: 'mcp-remote-bridge',
    targetFile: "Qodo Gen's MCP config panel",
  },

  // Cloud IDE
  {
    id: 'replit-agent',
    label: 'Replit Agent',
    category: 'Cloud IDE',
    kind: 'ui-connector',
    unpublished: true,
    targetFile: 'Replit Agent → Integrations (browser UI, no file)',
  },

  // Not part of Katalon's 36-client catalog, but a useful extra: lets you
  // poke at an MCP server's HTTP endpoint directly from an API client.
  {
    id: 'bruno',
    label: 'Bruno',
    category: 'API client (extra)',
    kind: 'bruno',
    targetFile: 'bruno-mcp-collection/ (bruno.json + .bru request files)',
  },
]

const SERVER_DEFINITIONS = [
  {
    key: 'testops',
    name: 'katalon-testops',
    label: 'Katalon TestOps',
    suffix: '/mcp',
  },
  {
    key: 'studio',
    name: 'katalon-studio-standalone',
    label: 'Katalon Studio',
    suffix: '/mcp/stream',
  },
  {
    key: 'jira',
    name: 'jira',
    label: 'Jira',
    suffix: '/mcp',
  },
  {
    key: 'azureDevOps',
    name: 'azure-devops',
    label: 'Azure DevOps',
    suffix: '/mcp',
  },
]

// Detects whether a URL's *path* (not its query string or fragment) already
// ends in /mcp or /mcp/stream, and appends the suffix into the path rather
// than onto the raw string. Using the URL API avoids a prior bug where a
// URL like ".../mcp?token=abc" was not recognized as already-suffixed
// (the check anchored on the end of the whole string) and got a second
// "/mcp" appended after the query string.
function normalizeUrl(baseUrl, suffix) {
  const raw = baseUrl.trim()
  if (!raw) return ''

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    // Not a fully-qualified URL (e.g. missing protocol) — fall back to
    // simple trailing-slash + suffix handling on the raw string.
    if (/\/mcp(\/stream)?\/?$/i.test(raw)) return raw
    return `${raw.replace(/\/+$/, '')}${suffix}`
  }

  const hasMcpPath = /\/mcp(\/stream)?\/?$/i.test(parsed.pathname)
  if (hasMcpPath) return raw

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}${suffix}`
  return parsed.toString()
}

function buildServerEntries(urls, platform) {
  const entries = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    // Claude Desktop's claude_desktop_config.json does not support
    // "type": "http" / "url" entries — it only supports stdio servers.
    // Bridge remote HTTP servers through mcp-remote instead.
    const definition =
      platform === 'claude'
        ? {
            command: 'npx',
            args: ['mcp-remote', normalized],
          }
        : {
            type: 'http',
            url: normalized,
          }

    return [[server.name, definition]]
  })

  return Object.fromEntries(entries)
}

function createPlatformPayload(platform, servers) {
  if (platform === 'vscode') {
    return {
      inputs: [],
      servers,
    }
  }

  return {
    mcpServers: servers,
  }
}

// Codex does not use JSON configuration. Its MCP servers are declared as
// TOML tables in ~/.codex/config.toml, one [mcp_servers.<name>] block per
// server, e.g.:
//
//   [mcp_servers.jira]
//   url = "https://example.atlassian.net/mcp"
//
// so Codex output must be generated as TOML text rather than run through
// createPlatformPayload/JSON.stringify like the other platforms.
function escapeTomlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildCodexToml(urls) {
  const blocks = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [`[mcp_servers.${server.name}]\nurl = "${escapeTomlString(normalized)}"`]
  })

  return blocks.join('\n\n')
}

// Bruno (usebruno.com) is an API client, not an MCP client — it has no
// "add mcp server" config file the way Claude Desktop, VS Code, and Codex
// do. What Bruno *can* do is act as a plain HTTP client against an MCP
// server's Streamable HTTP endpoint, performing the JSON-RPC handshake by
// hand: initialize -> notifications/initialized -> tools/list. So instead
// of a single config file, the "config" for Bruno is a small collection of
// .bru request files (one bruno.json plus, per server, an initialize /
// initialized / list-tools request) that do that handshake.
function buildMcpRequestBru({ name, seq, url, sessionVar, includeSessionHeader, body }) {
  const headerLines = ['Content-Type: application/json', 'Accept: application/json, text/event-stream']
  if (includeSessionHeader) {
    headerLines.push(`mcp-session-id: {{${sessionVar}}}`)
  }

  // Only the initialize request has a session id to capture — Bruno
  // returns response headers on `res.headers` inside a post-response script.
  const scriptBlock =
    name === 'initialize'
      ? `\n\nscript:post-response {\n  const sessionId = res.headers['mcp-session-id']\n  if (sessionId) {\n    bru.setVar('${sessionVar}', sessionId)\n  }\n}`
      : ''

  return (
    `meta {\n  name: ${name}\n  type: http\n  seq: ${seq}\n}\n\n` +
    `post {\n  url: ${url}\n  body: json\n}\n\n` +
    `headers {\n  ${headerLines.join('\n  ')}\n}\n\n` +
    `body:json {\n${JSON.stringify(body, null, 2)}\n}${scriptBlock}\n`
  )
}

function buildBrunoCollection(urls) {
  const serverFiles = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    const sessionVar = `${server.name.replace(/-/g, '_')}SessionId`

    const initialize = buildMcpRequestBru({
      name: 'initialize',
      seq: 1,
      url: normalized,
      sessionVar,
      includeSessionHeader: false,
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { roots: { listChanged: true } },
          clientInfo: { name: 'katalon-mcp-helper', version: '1.0.0' },
        },
      },
    })

    const initialized = buildMcpRequestBru({
      name: 'initialized',
      seq: 2,
      url: normalized,
      sessionVar,
      includeSessionHeader: true,
      body: {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      },
    })

    const listTools = buildMcpRequestBru({
      name: 'list-tools',
      seq: 3,
      url: normalized,
      sessionVar,
      includeSessionHeader: true,
      body: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      },
    })

    return [
      { path: `${server.name}/01-initialize.bru`, content: initialize },
      { path: `${server.name}/02-initialized.bru`, content: initialized },
      { path: `${server.name}/03-list-tools.bru`, content: listTools },
    ]
  })

  if (serverFiles.length === 0) return ''

  const brunoJson = JSON.stringify(
    {
      version: '1',
      name: 'katalon-mcp-servers',
      type: 'collection',
      ignore: ['node_modules', '.git'],
    },
    null,
    2,
  )

  const files = [{ path: 'bruno.json', content: brunoJson }, ...serverFiles]

  return files.map((file) => `// ===== ${file.path} =====\n${file.content}`).join('\n\n')
}

// Generic JSON-config builder for clients whose MCP config is a single
// JSON object with one root key (mcpServers / context_servers / mcp), where
// only the shape of each server's *value* differs between clients (e.g.
// {"url": ...} vs {"serverUrl": ...} vs {"httpUrl": ...} vs the mcp-remote
// stdio bridge). `entryBuilder(url)` returns that per-server value.
function buildGenericJsonConfig(urls, rootKey, entryBuilder) {
  const entries = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [[server.name, entryBuilder(normalized)]]
  })

  if (entries.length === 0) return ''

  return JSON.stringify({ [rootKey]: Object.fromEntries(entries) }, null, 2)
}

// Clients that are configured by running a CLI command per server rather
// than editing a file (Claude Code, Gemini CLI, Factory Droid, Sourcegraph
// Amp). `template(name, url)` builds one command line.
function buildCliCommands(urls, template) {
  const lines = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [template(server.name, normalized)]
  })

  return lines.join('\n')
}

// Clients with no config file at all — the server is added through a UI
// wizard (Claude.ai web, ChatGPT, Mistral Le Chat, Microsoft Copilot
// Studio, Perplexity, Replit Agent). There's nothing to paste into a file,
// so the "output" is a plain cheat-sheet of the fields that UI will ask for.
function buildUiConnectorCheatSheet(urls) {
  const blocks = SERVER_DEFINITIONS.flatMap((server) => {
    const normalized = normalizeUrl(urls[server.key], server.suffix)
    if (!normalized) return []

    return [
      `Connector name: ${server.name}\nServer URL: ${normalized}\nAuthentication: OAuth (sign in via browser on first use, if prompted)`,
    ]
  })

  return blocks.join('\n\n')
}

const INSTALLATION_INSTRUCTIONS = {
  claude: {
    intro:
      'Claude Desktop stores its MCP server configuration in claude_desktop_config.json. How you get to that file depends on which Claude Desktop version you have installed.',
    methods: [
      {
        title: 'Newer versions — Settings → Developer (recommended)',
        note: 'Use this method if your Claude Desktop has a "Developer" tab under Settings. This has been the standard method since mid-2025 releases.',
        steps: [
          'Open the Claude menu from your system menu bar (macOS) or the app window (Windows) — not the in-chat settings — and choose "Settings…".',
          'Select the "Developer" tab in the left sidebar.',
          'Click "Edit Config". This opens claude_desktop_config.json in your default text editor, creating the file if it does not already exist.',
          'Paste in the config segment shown above. If the file already has an "mcpServers" object, merge the new server entry into it rather than replacing the whole file.',
          'Save the file, then fully quit Claude Desktop (not just close the window) and reopen it.',
          'Look for the MCP/tools indicator in the message input area to confirm the server connected.',
        ],
      },
      {
        title: 'Older versions — manual file edit',
        note: 'Use this method if your Settings screen has no "Developer" tab. Locate and edit the config file directly with a text editor.',
        steps: [
          'Close Claude Desktop.',
          'Open the config file in a text editor, creating the folder/file if needed:',
          'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
          'Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
          'If the file is empty or new, start with { "mcpServers": {} }.',
          'Paste in the config segment shown above, merging it into the existing "mcpServers" object if one is already present.',
          'Save the file and reopen Claude Desktop.',
        ],
      },
    ],
  },
  vscode: {
    intro:
      'VS Code reads MCP server definitions from a workspace-level mcp.json file.',
    steps: [
      'In your project root, create a .vscode folder if one does not already exist.',
      'Inside it, create or open .vscode/mcp.json.',
      'Paste in the config segment shown above. If the file already has a "servers" object, merge the new entry into it rather than replacing the whole file.',
      'Save the file. VS Code will detect the new MCP server automatically (or use the "MCP: List Servers" command from the Command Palette to start it manually).',
      'Confirm the server appears and connects via the MCP status indicator in the Command Palette or the Copilot Chat view.',
    ],
  },
  codex: {
    intro:
      'Codex reads MCP servers as TOML tables from a global config file rather than JSON.',
    steps: [
      'Open (or create) ~/.codex/config.toml in a text editor.',
      'Paste in the TOML block(s) shown above, appending them to the file rather than replacing any existing content.',
      'Save the file.',
      'Restart Codex, or start a new session, so it picks up the updated configuration.',
      'Run a Codex command that lists configured MCP servers to confirm the new server is recognized.',
    ],
  },
  bruno: {
    intro:
      'Bruno is an API client, not an MCP client — it has no single "add MCP server" config file like Claude Desktop, VS Code, or Codex. Instead, the output above is a small Bruno collection that talks to each configured Katalon MCP server directly over HTTP, performing the MCP handshake (initialize → initialized → list tools) as three separate requests.',
    steps: [
      'Create a new folder on disk for the collection, e.g. katalon-mcp-bruno-collection.',
      'Save the "bruno.json" block from the output above as bruno.json in the root of that folder.',
      'For each server folder shown in the output (e.g. katalon-testops/, katalon-studio-standalone/), create a matching subfolder and save each block as its own file, using the "name" in its meta block for the filename (01-initialize.bru, 02-initialized.bru, 03-list-tools.bru).',
      'In Bruno, choose File → Open Collection and select the folder you created.',
      'Open a server\'s "01-initialize" request and click Send. Its post-response script automatically captures the returned mcp-session-id into a collection variable.',
      'Run "02-initialized", then "03-list-tools" for the same server — both pick up the stored session id automatically and should return the server\'s available tools.',
      'Repeat for any other configured servers; each has its own session variable, so they can be run independently of one another.',
    ],
  },
}

// Builds intro/steps for any client that doesn't have its own hand-written
// entry in INSTALLATION_INSTRUCTIONS (currently: claude, vscode, codex,
// bruno). Rather than hand-writing installation copy for all ~33 remaining
// clients individually, this generates reasonable, honest instructions
// from the client's `kind` and `targetFile` — the two things that actually
// vary the steps.
function getGenericInstallCopy(client) {
  if (client.kind === 'cli') {
    return {
      intro: `${client.label} is configured from its own CLI — there's no config file to hand-edit.`,
      steps: [
        'Open a terminal.',
        'Run the command(s) shown above, one per configured server.',
        `${client.label} writes the entry into its own MCP configuration automatically.`,
        `Restart ${client.label} (or start a new session) if the new server isn't picked up immediately.`,
      ],
    }
  }

  if (client.kind === 'ui-connector') {
    return {
      intro: `${client.label} connects to remote MCP servers through its own UI rather than a config file.`,
      steps: [
        `Open ${client.label} and find its MCP/connector settings (menu name and location vary by client — see ${client.targetFile}).`,
        'For each server shown above, add a new connector using its Server URL.',
        'Complete the OAuth sign-in flow in the browser if prompted.',
        'Confirm the connector shows as connected/active before using it in a conversation.',
      ],
    }
  }

  // All the JSON-config kinds (json-mcpServers-url / -serverUrl / -httpUrl,
  // json-context_servers-url, json-mcp-type-remote, mcp-remote-bridge)
  // share the same file-edit workflow — only the file location differs.
  return {
    intro: `${client.label} reads its MCP server configuration from ${client.targetFile}.`,
    steps: [
      `Open (or create) ${client.targetFile} in a text editor.`,
      'Paste in the config segment shown above, merging it into any existing root object rather than replacing the whole file.',
      'Save the file.',
      `Restart ${client.label} (or use its "reload MCP servers" action) so it picks up the change.`,
    ],
  }
}

function App() {
  const [urls, setUrls] = useState(DEFAULT_URLS)
  const [platform, setPlatform] = useState('claude')
  const [output, setOutput] = useState('')

  const selectedClient = useMemo(() => CLIENTS.find((client) => client.id === platform), [platform])

  const genericInstallCopy = useMemo(() => {
    if (!selectedClient || INSTALLATION_INSTRUCTIONS[platform]) return null
    return getGenericInstallCopy(selectedClient)
  }, [selectedClient, platform])

  const handleUrlChange = (field) => (event) => {
    setUrls((previous) => ({
      ...previous,
      [field]: event.target.value,
    }))
  }

  const handleGenerate = () => {
    if (platform === 'codex') {
      setOutput(buildCodexToml(urls))
      return
    }

    if (platform === 'bruno') {
      setOutput(buildBrunoCollection(urls))
      return
    }

    if (platform === 'claude' || platform === 'vscode') {
      const servers = buildServerEntries(urls, platform)
      const payload = createPlatformPayload(platform, servers)
      setOutput(JSON.stringify(payload, null, 2))
      return
    }

    switch (selectedClient?.kind) {
      case 'cli':
        setOutput(buildCliCommands(urls, selectedClient.cli))
        break
      case 'ui-connector':
        setOutput(buildUiConnectorCheatSheet(urls))
        break
      case 'json-mcpServers-url':
        setOutput(buildGenericJsonConfig(urls, 'mcpServers', (url) => ({ url })))
        break
      case 'json-mcpServers-serverUrl':
        setOutput(buildGenericJsonConfig(urls, 'mcpServers', (url) => ({ serverUrl: url })))
        break
      case 'json-context_servers-url':
        setOutput(buildGenericJsonConfig(urls, 'context_servers', (url) => ({ url })))
        break
      case 'json-mcpServers-httpUrl':
        setOutput(buildGenericJsonConfig(urls, 'mcpServers', (url) => ({ httpUrl: url })))
        break
      case 'json-mcp-type-remote':
        setOutput(buildGenericJsonConfig(urls, 'mcp', (url) => ({ type: 'remote', url, enabled: true })))
        break
      case 'mcp-remote-bridge':
        setOutput(
          buildGenericJsonConfig(urls, 'mcpServers', (url) => ({
            command: 'npx',
            args: ['-y', 'mcp-remote', url, '--transport', 'http-first'],
          })),
        )
        break
      default:
        setOutput('')
    }
  }

  return (
    <main className="page-shell">
      <section className="generator-card" aria-label="MCP JSON Generator">
        <header className="hero">
          <p className="eyebrow">MCP Helper</p>
          <h1>MCP JSON Builder</h1>
          <p className="subtitle">
            Enter primary server URLs, pick the MCP client your team uses, and
            generate a ready-to-use config or command.
          </p>
        </header>

        <div className="grid-layout">
          <section className="panel" aria-labelledby="input-urls-title">
            <h2 id="input-urls-title">1. Primary Server URLs</h2>

            <div className="field-list">
              {SERVER_DEFINITIONS.map((server) => (
                <label key={server.key} className="field">
                  <span>{server.label}</span>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={urls[server.key]}
                    onChange={handleUrlChange(server.key)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="format-title">
            <h2 id="format-title">2. Output MCP Config Format</h2>
            <label className="select-field">
              <span>MCP client</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                {CATEGORY_ORDER.map((category) => (
                  <optgroup label={category} key={category}>
                    {CLIENTS.filter((client) => client.category === category).map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {selectedClient?.unpublished && (
              <p className="hint caution">
                Katalon's client catalog doesn't publish an exact snippet for {selectedClient.label} — the format
                below is a best-effort generic MCP config. Confirm exact key names and file paths in{' '}
                {selectedClient.label}'s own docs before relying on it.
              </p>
            )}
          </section>

          <section className="panel action-panel" aria-labelledby="generate-title">
            <h2 id="generate-title">3. Generate</h2>
            <button type="button" className="generate-button" onClick={handleGenerate}>
              Generate MCP Config File
            </button>
            <p className="hint">
              Selected format: {selectedClient?.label} ({selectedClient?.targetFile})
            </p>
          </section>

          <section className="panel output-panel" aria-labelledby="output-title">
            <h2 id="output-title">4. Output</h2>
            <pre className="output-box" aria-live="polite">
              {output}
            </pre>
          </section>

          {output && (
            <section className="panel installation-panel" aria-labelledby="installation-title">
              <h2 id="installation-title">5. Installation Instructions</h2>
              <p className="hint">
                How to add the {selectedClient?.label} config segment above to{' '}
                {selectedClient?.targetFile}.
              </p>

              {platform === 'claude' ? (
                <>
                  <p className="install-intro">{INSTALLATION_INSTRUCTIONS.claude.intro}</p>
                  {INSTALLATION_INSTRUCTIONS.claude.methods.map((method) => (
                    <div className="install-method" key={method.title}>
                      <h3>{method.title}</h3>
                      <p className="install-note">{method.note}</p>
                      <ol>
                        {method.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </>
              ) : INSTALLATION_INSTRUCTIONS[platform] ? (
                <div className="install-method">
                  <p className="install-intro">{INSTALLATION_INSTRUCTIONS[platform].intro}</p>
                  <ol>
                    {INSTALLATION_INSTRUCTIONS[platform].steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : (
                genericInstallCopy && (
                  <div className="install-method">
                    <p className="install-intro">{genericInstallCopy.intro}</p>
                    <ol>
                      {genericInstallCopy.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {selectedClient?.unpublished && (
                      <p className="install-note">
                        Katalon's catalog doesn't publish an exact snippet for {selectedClient.label}; confirm the
                        details above against {selectedClient.label}'s own docs.
                      </p>
                    )}
                  </div>
                )
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
