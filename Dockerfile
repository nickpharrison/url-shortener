
FROM node:20.18.1-alpine

ENV NODE_ENV production

RUN mkdir /database && mkdir /app

WORKDIR /app

COPY ./package.json ./package.json

COPY ./package-lock.json ./package-lock.json

RUN npm install --omit=dev

COPY ./assets ./assets

COPY ./docker.default.env ./.env

COPY ./src ./src

CMD [ "node", "./src/index.js" ]
