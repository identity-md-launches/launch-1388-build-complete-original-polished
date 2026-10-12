export default {
  base: "./",
  plugins: [
    {
      name: "opaque-origin-static-export",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          // The arcade sandbox has an opaque origin. Classic scripts and inline font
          // bytes work even on a static host that does not send CORS headers.
          return html
            .replace(/<script type="module" crossorigin/g, "<script defer")
            .replace(
              /<link rel="stylesheet" crossorigin/g,
              '<link rel="stylesheet"',
            );
        },
      },
    },
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit: 24000,
    cssCodeSplit: false,
    minify: false,
    rollupOptions: { output: { format: "iife" } },
  },
};
