FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
EXPOSE 4173

# Standalone static + /api bridge server (no Vite preview in production).
CMD ["npm", "run", "start"]
