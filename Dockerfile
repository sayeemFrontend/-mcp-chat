# --- dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- dev server with hot reload (used by docker-compose.dev.yml; source is bind-mounted) ---
# Runs the embed.js watch build next to the Vite dev server, which serves it at /embed.js.
FROM deps AS dev
EXPOSE 5173
CMD ["sh", "-c", "npm run dev:embed & exec npm run dev -- --host 0.0.0.0"]

# --- build ---
FROM deps AS build
COPY . .
# Baked into the bundle at build time: the URL the *browser* uses to reach the LLM server.
ARG VITE_CHAT_API_URL=http://localhost:8000
# Widget key of the standalone app at / (embeds get theirs from the host page). Dev convenience only:
# it is baked into the bundle, so never put a real secret key here for a public deployment.
ARG VITE_WIDGET_KEY=
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL VITE_WIDGET_KEY=$VITE_WIDGET_KEY
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
