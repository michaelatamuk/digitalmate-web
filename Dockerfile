FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 4173

# Vite preview loads the same RSS and Orbit bridge plugins as the dev server.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
