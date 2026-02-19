// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@auth0/auth0-react": path.resolve(
        process.cwd(),
        "src/auth/local-auth-react.jsx"
      ),
    },
  },
  server: {
    host: "localhost",
    port: 3000,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
       
    },
  },
});
