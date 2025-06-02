FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json for reproducible installs
COPY package.json package-lock.json ./

# Install dependencies cleanly and reproducibly based on package-lock.json
RUN npm ci --ignore-scripts

# Install curl for healthchecks (Alpine uses apk)
RUN apk add --no-cache curl

COPY . .

RUN DATABASE_URL=$DATABASE_URL npm run build

EXPOSE 8080

CMD ["npm", "run", "start"]
