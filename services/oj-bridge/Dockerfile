# OpenJiuwen bridge: a dependency-free Node service that adapts the app's
# /api/orbit/* and /api/hive/* contract to a JiuwenSwarm runtime.
FROM node:22-alpine

WORKDIR /app
COPY server.mjs hive.mjs ./

ENV NODE_ENV=production \
    OJ_BRIDGE_HOST=0.0.0.0 \
    OJ_BRIDGE_PORT=8790 \
    OJ_BASE_URL=http://jiuwenswarm:8770

EXPOSE 8790
USER node
CMD ["node", "server.mjs"]
