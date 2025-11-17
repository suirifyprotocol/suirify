# Use a minimal, secure base image
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Command to run when the enclave starts
CMD ["node", "enclave.js"]