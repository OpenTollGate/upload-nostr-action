const core = require('@actions/core');
const { RelayPool, getPublicKey, signEvent } = require('nostr-tools');
const { WebSocket } = require('ws');

async function run() {
    try {
        const host = core.getInput('host', { required: true });
        const relay = core.getInput('relay', { required: true });
        const fileHash = core.getInput('blossom-hash', { required: true });
        const nsec = core.getInput('nsec', { required: true });

        console.log("NSEC (before signing):", nsec); // Log nsec *before* using it

        const blossom_servers = [host];
        const relays = [relay];
        const pool = RelayPool(relays);

        pool.on('open', async (relay) => {
            console.log('Connected to Nostr relay');

            const event = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [['file-hash', fileHash]],
                content: `File uploaded with hash: ${fileHash}`,
            };

            try {
                const signedEvent = signEvent(event, nsec); // Sign the event
                console.log("Signed event:", signedEvent);
                relay.publish(signedEvent);
                core.setOutput('event-id', signedEvent.id);
            } catch (signError) {
                console.error("Error signing event:", signError);
                core.setFailed(`Failed to sign Nostr event: ${signError.message}`);
            }
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
        console.error("Action failed:", error);
        core.setFailed(error.message);
    }
}

run();
