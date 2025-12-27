export default {
    esbuild: {
        // No native modules to exclude for this project
        external: [],

        // Enable minification for production
        minify: true,

        // Set Node.js target version to match Dockerfile (node:20)
        target: "node20",
        platform: "node",
        format: "esm",
    },
};
