# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Angular 18 default output is dist/[project-name]/browser
RUN npx ng build --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Verify your project name in angular.json matches 'aim-webui'
COPY --from=build /app/dist/aim-webui/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
