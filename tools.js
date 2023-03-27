const core = require("@actions/core");
const semver = require("semver");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");

async function findLatestRelease(
    targetVersion,
    token,
    includePrerelease = false
) {
    const releases = await listReleases(token);
    const versionMatch = semver.maxSatisfying(
        Object.keys(releases),
        targetVersion,
        { includePrerelease }
    );
    if (versionMatch != null) {
      core.info(`Matched version ${versionMatch}`);
    } else {
      core.setFailed(`No matching versions found`);
    }
    return { version: versionMatch, location: releases[versionMatch] };
}

function getTargetPlatformArch() {
    const machinePlat = os.platform();
    if (machinePlat === "win32") {
        return {
            plat: "win",
            arch: os.arch() === "x64" ? "64" : "32",
        };
    }
    const arch = os.arch() === "x64" ? "x86_64" : "x86_32";
    if (machinePlat === "darwin") {
        return {
            plat: "osx",
            arch,
        };
    }
    return {
        plat: "linux",
        arch,
    };
}

function normalizeVersion(v) {
    var [v, pre] = v.split("-");
    const partCount = v.split(".").length;
    if (partCount < 3) {
        v += ".0".repeat(3 - partCount);
    }
    if (pre != null) {
        v += `-${pre}`;
    }
    return v;
}

async function listReleases(token) {
    const octokit = github.getOctokit(token);
    const target = getTargetPlatformArch();
    var releases = {};
    for (let page = 1, morePages = true; morePages; page++) {
        const { data: releasesPage } = await octokit.rest.repos.listReleases({
            owner: "protocolbuffers",
            repo: "protobuf",
            page,
        });
        if (releasesPage.length > 0) {
            releases = releasesPage.reduce((acc, r) => {
                const normalized = normalizeVersion(r.tag_name);
                if (normalized == null) {
                    core.debug(
                        `Skipping ${r.tag_name} because version cannot be normalized`
                    );
                    return acc;
                }

                const location = r.assets.filter((a) => a.name.includes(target.plat) && a.name.includes(target.arch))?.[0]?.browser_download_url;
                if (location == null) {
                    core.debug(
                        `Skipping ${r.tag_name} because it doesn't have a supported download`
                    );
                    return acc;
                }
                acc[normalizeVersion(r.tag_name)] = location;
                return acc;
            }, releases);
        } else {
            morePages = false;
        }
    }
    return releases;
}

async function downloadRelease(location, version) {
  try {
    // Attempt to locate
    const toolPath = tc.find("protoc", version); 
    if (toolPath) {
      core.info(`Found cached protoc ${version}`);
      return path.join(toolPath, "bin");
    }
    // Attempt to download
    core.info(`Attempting to download protoc ${version} at ${location}`);
    let downloadPath = await tc.downloadTool(location);
    if (!downloadPath.endsWith(".zip")) {
        core.debug("Renaming download to contain .zip extension");
        const originalPath = downloadPath;
        downloadPath = path.join(path.dirname(originalPath), path.basename(originalPath) + ".zip");
        await fs.rename(originalPath, downloadPath);
    }
    // Attempt to extract
    const extractionPath = await tc.extractZip(downloadPath);
    // Attempt to cache
    return path.join(await tc.cacheDir(extractionPath, "protoc", version), "bin")
  } catch (error) {
    core.setFailed(error);
  }
}

module.exports.findLatestRelease = findLatestRelease;
module.exports.downloadRelease = downloadRelease;
