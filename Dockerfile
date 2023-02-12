FROM node:18-slim

WORKDIR /app

COPY package.json /app/

RUN npm install

COPY . /app/

RUN mkdir /app/uploads

EXPOSE $PORT

CMD ["npm", "start"]
