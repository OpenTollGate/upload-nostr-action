const core = require('@actions/core');
const { RelayPool, getPublicKey, signEvent } = require('nostr-tools'); // Use nostr-tools
const { WebSocket } = require('ws'); // For the websocket connection

async function run() {
  try {
    const host = core.getInput('host', { required: true });
    const relay = core.getInput('relay', { required: true });
    const fileHash = core.getInput('file-hash', { required: true });
    const nsec = core.getInput('nsec', { required: true });

    const blossom_servers = [host];
    const relays = [relay];
    const pool = RelayPool(relays);

    pool.on('open', async (relay) => {
      console.log('Connected to Nostr relay');

      const event = {
        kind: 1, // Or your event kind
        created_at: Math.floor(Date.now() / 1000),
        tags: [['file-hash', fileHash]],
        content: `File uploaded with hash: ${fileHash}`,
      };

      const signedEvent = signEvent(event, nsec);
      relay.publish(signedEvent);

      core.setOutput('event-id', signedEvent.id); // Set the output

    });

    pool.on('eose', (relay) => {
      relay.close();
      console.log('Event published and relay closed.');
    });

    pool.on('error', (relay, error) => {
      console.error('WebSocket error:', error);
      core.setFailed(`Failed to announce to Nostr: ${error.message}`);
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
