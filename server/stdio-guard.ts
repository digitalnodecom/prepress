// `prepress mcp` speaks JSON-RPC on stdout: anything else printed there would
// corrupt the stream. Imported first by main.ts, before code that might log.
if (process.argv[2] === 'mcp') {
  const toStderr = (...a: unknown[]) => console.error(...a);
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
}
export {};
