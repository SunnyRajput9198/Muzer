FROM node:20-alpine

WORKDIR /app

# Install OpenSSL and libc6-compat for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl libc6-compat

# Set LD_PRELOAD for glibc compatibility (important for Prisma on Alpine)
ENV LD_PRELOAD=/lib/libc.so.6

# Declare DATABASE_URL as a build argument.
# Render will pass the DATABASE_URL environment variable as this build argument.
ARG DATABASE_URL

# CRUCIAL FIX: Promote the build argument to an environment variable for this stage.
# This makes DATABASE_URL reliably available to subsequent RUN commands.
ENV DATABASE_URL=${DATABASE_URL}

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Clean install dependencies based on package-lock.json
RUN npm ci --ignore-scripts

# Install curl for healthchecks (Alpine uses apk)
RUN apk add --no-cache curl

COPY . .

# Run your frontend application's build process,
# then generate Prisma client, and finally run Prisma database migrations.
# DATABASE_URL is now available as a standard ENV variable in this build step.
RUN npm run build \
    && npx prisma generate \
    && npx prisma migrate deploy

EXPOSE 3000

CMD ["npm", "run", "start"]
