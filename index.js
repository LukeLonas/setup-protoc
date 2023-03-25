const core = require("@actions/core");
const tools = require("./tools");

async function run() {
    try {
        const version = core.getInput("version");
        const token = core.getInput("token");
        const includePrerelease = core.getBooleanInput("prereleases");

        const latestRelease = await tools.findLatestRelease(
            version,
            token,
            includePrerelease
        );

        const toolPath = await tools.downloadRelease(
            latestRelease.location,
            latestRelease.version
        );

        core.info(`Adding protoc ${latestRelease.version} to PATH`);
        core.addPath(toolPath);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
