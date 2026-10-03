// Generates the app icons in public/ from public/icon.svg. Re-run after editing the SVG:
//   npx @vite-pwa/assets-generator
// The SVG already has a full dark background with the art centred, so no padding is added.
export default {
  headLinkOptions: { preset: "2023" },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, "favicon.ico"]], padding: 0 },
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: "#050806" } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: "#050806" } },
  },
  images: ["public/icon.svg"],
};
