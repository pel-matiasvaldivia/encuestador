FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the frontend
RUN npm run build

# We just need to build it.
# The docker-compose uses a volume to share /app/dist with nginx.
CMD ["echo", "Frontend built successfully"]
