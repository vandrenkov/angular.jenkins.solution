# Build Angular app, then serve static files with nginx
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Karma/Puppeteer Chromium is not used during `ng build`; skip the large browser download.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npx ng build viks-webui --configuration production

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/viks-webui/browser /usr/share/nginx/html

EXPOSE 80
