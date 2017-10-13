FROM node:8.7.0-alpine

WORKDIR /usr/local/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]