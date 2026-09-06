import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const MCP_URL = process.env.MCP_URL ?? 'http://127.0.0.1:3000/mcp';
const MCP_TOKEN = process.env.MCP_TOKEN ?? 'change-me';

const client = new Client(
  { name: 'lan-file-test-client', version: '1.0.0' },
  { versionNegotiation: { mode: 'auto' } }
);

const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${MCP_TOKEN}`
    }
  }
});

await client.connect(transport);

console.log('Tools:');
console.log((await client.listTools()).tools.map(tool => tool.name));

console.log('\nFør:');
console.log(await client.callTool({ name: 'read_text_file', arguments: {} }));

await client.callTool({
  name: 'append_text_file',
  arguments: { text: `Skrevet via MCP: ${new Date().toISOString()}` }
});

console.log('\nEfter:');
console.log(await client.callTool({ name: 'read_text_file', arguments: {} }));

await client.close();
