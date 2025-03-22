FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy client and shared folders
COPY client/ ./client/
COPY shared/ ./shared/
COPY postcss.config.js tailwind.config.ts theme.json vite.config.ts ./

# Build the client
RUN npm run build

# Use nginx to serve the static files
FROM nginx:alpine

# Copy the built client files to nginx's serving directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration to properly handle SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://server:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]