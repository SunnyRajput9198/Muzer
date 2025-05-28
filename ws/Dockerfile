FROM node:22-alpine

WORKDIR /app

COPY package.json .

RUN npm install npm -g --ignore-scripts

RUN npm install --ignore-scripts

COPY . .

RUN DATABASE_URL=$DATABASE_URL npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]