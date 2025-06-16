FROM node:lts
WORKDIR /app
COPY . .

# Compile code inside Dockerfile
RUN npm install
RUN npm run build

# Its running a express backend so you have to expose 3000
EXPOSE 3000

# Runs the configured script in package.json
CMD npm run start