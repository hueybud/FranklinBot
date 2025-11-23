import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/index.js",
  sourcemap: true, // keep sourcemaps on to help debug
  plugins: [
    copy({
      assets: {
        from: ["src/assets/**/*"],
        to: ["assets"],
      }
    })
  ]
}).catch(() => process.exit(1));
