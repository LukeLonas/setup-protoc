const process = require("process");
const cp = require("child_process");
const path = require("path");
const tools = require("./tools");

// test('throws invalid number', async () => {
//   await expect(wait('foo')).rejects.toThrow('milliseconds not a number');
// });

test('Print findLatestRelease output', async () => {
  var target = await tools.findLatestRelease('22.x', "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");
  console.log(target);
}, 60000);

// shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//   process.env['INPUT_VERSION'] = '3.x';
//   process.env['INPUT_TOKEN'] = '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';
//   process.env['INPUT_PRERELEASES'] = 'false';
//   const ip = path.join(__dirname, 'index.js');
//   const result = cp.execSync(`node ${ip}`, {env: process.env}).toString();
//   console.log(result);
// })
