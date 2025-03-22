# Use official Node.js image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if you have it)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your API will run on (5000 in this case)
EXPOSE 5000

# Set the command to run your API
CMD ["npm", "run", "start"]
