// Minimal fake Orbit gateway for testing the web bridge without real credentials.
// Usage:
//   node scripts/fake-orbit.mjs
//   ORBIT_GATEWAY_URL=ws://127.0.0.1:8899/orbit/ws ORBIT_TOKEN=test \
//     ORBIT_ALLOW_INSECURE_WS=1 npm run dev
//
// It speaks only the small subset used by server/orbit.ts: room.home, room.message,
// orbit.task.text. It is not a protocol reference implementation.

import { WebSocketServer } from 'ws';

const port = Number(process.env.FAKE_ORBIT_PORT ?? 8899);
const roomId = 'room_demo';

const server = new WebSocketServer({
  port,
  path: '/orbit/ws',
  verifyClient: ({ req }, done) => {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) {
      done(false, 401, 'Missing Bearer token');
      return;
    }
    done(true);
  }
});

server.on('connection', socket => {
  socket.send(JSON.stringify({ event: 'orbit.changed', room_id: roomId }));

  socket.on('message', raw => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.method !== 'orbit.request') return;
    const action = message.params?.action;

    if (action === 'room.home') {
      socket.send(
        JSON.stringify({
          id: message.id,
          ok: true,
          result: { room_id: roomId, snapshot: { room_id: roomId } }
        })
      );
      return;
    }

    if (action === 'room.message') {
      socket.send(JSON.stringify({ id: message.id, ok: true, result: { task_id: 'task_demo' } }));
      const text = `Fake Orbit received: ${message.params?.text ?? ''}`;
      socket.send(JSON.stringify({ event: 'orbit.task.text', task_id: 'task_demo', text, final: false }));
      socket.send(
        JSON.stringify({
          event: 'orbit.task.a2ui',
          task_id: 'task_demo',
          envelopes: [
            {
              version: 'v0.9.1',
              createSurface: {
                surfaceId: 'surface_fake',
                root: 'root',
                title: 'Orbit surface',
                subtitle: 'Streamed from the fake gateway'
              }
            },
            {
              version: 'v0.9.1',
              updateComponents: {
                surfaceId: 'surface_fake',
                components: [
                  { id: 'root', component: 'SurfaceRoot', child: 'body', title: 'Orbit surface' },
                  { id: 'body', component: 'Text', text: 'A2UI surface received through the bridge.' }
                ]
              }
            },
            { version: 'v0.9.1', updateDataModel: { surfaceId: 'surface_fake', path: '/', value: {} } }
          ]
        })
      );
      setTimeout(() => {
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({ event: 'orbit.task.text', task_id: 'task_demo', text: '', final: true })
          );
        }
      }, 250);
    }
  });
});

console.log(`fake Orbit gateway listening on ws://127.0.0.1:${port}/orbit/ws`);
