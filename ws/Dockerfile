FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Install curl for healthchecks (Alpine uses apk)
RUN apk add --no-cache curl

# Copy the rest of your application code
COPY . .

# Build your application (if you have a build step like TypeScript compilation)
# and then run Prisma client generation and migrations.
# DATABASE_URL is available during the build because Render injects it.
# This runs migrations every time the Docker image is built.
RUN npm run build && npx prisma generate && npx prisma migrate deploy

EXPOSE 8080

CMD ["npm", "run", "start"]