const core = require('@actions/core');
const { RelayPool, getPublicKey, signEvent } = require('nostr-tools');
const { WebSocket } = require('ws');

async function run() {
    try {
        const host = core.getInput('host', { required: true });
        const relay = core.getInput('relay', { required: true });
        const blossomHash = core.getInput('blossom-hash', { required: true });
        // const nsec = core.getInput('nsec', { required: true });
        const nsec = "f77b10f372165652103bfccadcd32669135164025ef59e7c254e83730357f4d6"

        console.log("NSEC (before signing):", nsec); // Log nsec *before* using it

        const blossom_servers = [host];
        const relays = [relay];
        const pool = RelayPool(relays);

        pool.on('open', async (relay) => {
            console.log('Connected to Nostr relay');

            const event = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [['blossom-hash', blossomHash]],
                content: `File uploaded with hash: ${blossomHash}`,
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
