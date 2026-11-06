import { defineConfig } from "vite";

// base: "./" — пути к скриптам и стилям в dist/ относительные,
// поэтому сайт работает и в корне домена, и в подпапке (GitHub Pages: /имя-репозитория/).
export default defineConfig({
  base: "./",
});
