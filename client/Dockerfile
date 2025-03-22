# Use the official Node.js image for building
FROM node:18 AS build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if you have it)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Use a smaller image for production (optional, but recommended)
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app ./

# Expose the port Next.js will run on (3000)
EXPOSE 3000

# Start the Next.js server in production mode
CMD ["npm", "run", "start"]
