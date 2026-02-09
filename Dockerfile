FROM node:22-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .
EXPOSE 3014
CMD ["node", "taskServ.js"]