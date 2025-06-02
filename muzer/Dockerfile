FROM node:20-alpine

WORKDIR /app

# Declare DATABASE_URL as a build argument
ARG DATABASE_URL

# Copy package.json and package-lock.json for reproducible installs
COPY package.json package-lock.json ./

# Clean install dependencies based on package-lock.json
RUN npm ci --ignore-scripts

COPY . .

# Run Prisma generate and build with DATABASE_URL environment variable
RUN DATABASE_URL=$DATABASE_URL npx prisma generate
RUN DATABASE_URL=$DATABASE_URL npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
