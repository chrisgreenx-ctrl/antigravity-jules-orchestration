export default {
    esbuild: {
        // Mark problematic packages as external
        external: ["playwright-core", "puppeteer-core"],

        // Enable minification for production
        minify: true,

        // Set Node.js target version to match Dockerfile (node:20)
        target: "node20",
    },
};
