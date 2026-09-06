import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE ?? '/data/shared.txt';
const MCP_TOKEN = process.env.MCP_TOKEN;

if (!MCP_TOKEN) {
  throw new Error('MCP_TOKEN mangler. Opret en .env-fil ud fra .env.');
}

const allowedHosts = (process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

await mkdir(path.dirname(DATA_FILE), { recursive: true });
try {
  await readFile(DATA_FILE, 'utf8');
} catch {
  await writeFile(DATA_FILE, 'Denne tekst ligger på værtsmaskinen.\n', 'utf8');
}

function buildServer() {
  const server = new McpServer({
    name: 'lan-file-server',
    version: '1.0.0'
  });

  server.registerResource(
    'shared-text',
    'notes://shared',
    {
      title: 'Delt tekstfil',
      description: 'Indholdet af den tekstfil, der er mountet ind i Docker-containeren.',
      mimeType: 'text/plain'
    },
    async uri => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: await readFile(DATA_FILE, 'utf8')
        }
      ]
    })
  );

  server.registerTool(
    'read_text_file',
    {
      description: 'Læs hele den delte tekstfil.'
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: await readFile(DATA_FILE, 'utf8')
        }
      ]
    })
  );

  server.registerTool(
    'write_text_file',
    {
      description: 'Overskriv hele den delte tekstfil med ny tekst.',
      inputSchema: z.object({
        text: z.string().max(10_000)
      })
    },
    async ({ text }) => {
      await writeFile(DATA_FILE, text, 'utf8');
      return {
        content: [{ type: 'text', text: 'Filen blev overskrevet.' }]
      };
    }
  );

  server.registerTool(
    'append_text_file',
    {
      description: 'Tilføj tekst nederst i den delte tekstfil.',
      inputSchema: z.object({
        text: z.string().max(2_000)
      })
    },
    async ({ text }) => {
      await appendFile(DATA_FILE, `${text}\n`, 'utf8');
      return {
        content: [{ type: 'text', text: 'Teksten blev tilføjet.' }]
      };
    }
  );

  return server;
}

const app = createMcpExpressApp({
  host: HOST,
  allowedHosts,
  allowedOrigins: allowedHosts
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/mcp', (req, res, next) => {
  if (req.headers.authorization !== `Bearer ${MCP_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

const nodeHandler = toNodeHandler(createMcpHandler(buildServer));

app.all('/mcp', (req, res) => {
  void nodeHandler(req, res, req.body);
});

app.listen(PORT, HOST, () => {
  console.log(`MCP server: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Tilladte hosts: ${allowedHosts.join(', ')}`);
  console.log(`Fil i container: ${DATA_FILE}`);
});
