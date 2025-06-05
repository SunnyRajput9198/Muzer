FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and libc6-compat for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl libc6-compat

# Set LD_PRELOAD for glibc compatibility (important for Prisma on Alpine)
ENV LD_PRELOAD=/lib/libc.so.6

# Declare DATABASE_URL as a build argument.
# Render will pass the DATABASE_URL environment variable as this build argument.
ARG DATABASE_URL

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies cleanly and reproducibly
RUN npm ci --ignore-scripts

# Install curl for healthchecks (Alpine uses apk)
RUN apk add --no-cache curl

# Copy the rest of your application code (including schema.prisma and migrations)
COPY . .

# Build your application (if you have a build step like TypeScript compilation),
# then generate the Prisma client, and finally run Prisma database migrations.
# We explicitly pass DATABASE_URL to Prisma commands because it's an ARG,
# not a standard environment variable during the RUN step.
RUN npm run build && DATABASE_URL=$DATABASE_URL npx prisma generate && DATABASE_URL=$DATABASE_URL npx prisma migrate deploy

EXPOSE 8080

CMD ["npm", "run", "start"]