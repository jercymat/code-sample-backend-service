FROM node:20-alpine3.18

WORKDIR /app
COPY . /app

EXPOSE 8080
USER node

ENTRYPOINT ["node","/app/dist/index.js"]
