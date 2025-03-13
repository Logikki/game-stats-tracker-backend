FROM node:20-alpine 

WORKDIR /build

COPY package*.json .

RUN npm install --omit=dev && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["node", "dist/index.js"]