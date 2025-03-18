// This script reads the manifest.json file, modifies the paths to work inside the dist directory,
// and writes the modified manifest to dist/manifest.json

import fs from "fs/promises";
import path from "path";

async function prepareManifest() {
  try {
    // Read the original manifest.json
    const manifestPath = path.join(process.cwd(), "manifest.json");
    const manifestContent = await fs.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);

    // Update paths to remove 'dist/' prefix
    if (manifest.background && manifest.background.service_worker) {
      manifest.background.service_worker =
        manifest.background.service_worker.replace("dist/", "");
    }

    if (manifest.action && manifest.action.default_popup) {
      manifest.action.default_popup = manifest.action.default_popup.replace(
        "dist/",
        ""
      );
    }

    if (manifest.action && manifest.action.default_icon) {
      Object.keys(manifest.action.default_icon).forEach((size) => {
        manifest.action.default_icon[size] = manifest.action.default_icon[
          size
        ].replace("dist/", "");
      });
    }

    if (manifest.icons) {
      Object.keys(manifest.icons).forEach((size) => {
        manifest.icons[size] = manifest.icons[size].replace("dist/", "");
      });
    }

    // Write the modified manifest to dist/manifest.json
    const distManifestPath = path.join(process.cwd(), "dist", "manifest.json");
    await fs.writeFile(
      distManifestPath,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
    console.log("Manifest prepared successfully");
  } catch (error) {
    console.error("Error preparing manifest:", error);
    process.exit(1);
  }
}

prepareManifest();
