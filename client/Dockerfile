FROM node:20-slim AS build

WORKDIR /app

# Accept build arguments
ARG NODE_ENV=production

# Set environment variables
ENV NODE_ENV=${NODE_ENV}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project (needed for build context)
COPY . .

# First, create a custom build script to avoid the entry point issue
# Making sure to explicitly set the working directory and add debugging
RUN echo '#!/bin/bash\necho "Current directory: $(pwd)"\nls -la\necho "Changing to client directory..."\ncd /app/client\necho "Now in: $(pwd)"\nls -la\necho "Copying Vite config file to the current directory..."\ncp /app/vite.config.ts ./\necho "Running Vite build..."\nNODE_ENV=production npx vite build --config /app/vite.config.ts\necho "Build complete, checking output:"\nls -la dist' > build-client.sh
RUN chmod +x build-client.sh

# Run our custom build script that starts in the client directory
RUN ./build-client.sh

# Add a step to check what's in the dist directory
RUN ls -la /app/client/dist || echo "client/dist not found"

# Use nginx to serve the static files
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy the built client files to nginx's serving directory
# In development build, Vite outputs to client/dist
# But for Docker build, it should be in client/dist after our custom script
COPY --from=build /app/client/dist /usr/share/nginx/html

# Copy a custom nginx configuration to properly handle SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://server:5000/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]