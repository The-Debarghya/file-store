FROM node:18-slim

WORKDIR /app

COPY package.json /app/

RUN npm install

COPY . /app/

VOLUME [ "/app/uploads" ]

EXPOSE $PORT

CMD ["npm", "start"]
