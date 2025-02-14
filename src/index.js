const core = require('@actions/core');
const { SimplePool } = require('nostr-tools');
const { getPublicKey, finalizeEvent } = require('nostr-tools/pure');
const WebSocket = require('ws');

global.WebSocket = WebSocket;

async function run() {
    let pool = null;
    try {
        console.log("Starting Nostr announcement process...");
        
        const host = core.getInput('host', { required: true });
        const relay = core.getInput('relay', { required: true });
        console.log(`Got inputs - Host: ${host}, Relay: ${relay}`);
        
        const blossomHash = "c87e2ca771bab6024c269b933389d2a92d4941c848c52f155b9b84e1f109fe35";
        const nsec = "f77b10f372165652103bfccadcd32669135164025ef59e7c254e83730357f4d6";
        console.log("Using hardcoded blossomHash:", blossomHash);
        
        console.log("Creating SimplePool...");
        pool = new SimplePool();
        
        // Connect to relay with timeout
        console.log(`Connecting to relay: ${relay}`);
        const relayConnection = new Promise((resolve, reject) => {
            const relayInstance = pool.ensureRelay(relay);
            relayInstance.on('connect', () => resolve(relayInstance));
            relayInstance.on('error', reject);
        });

        // Wait for connection with 30 second timeout
        const connectedRelay = await Promise.race([
            relayConnection,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Relay connection timeout after 30 seconds')), 30000)
            )
        ]);

        console.log('Successfully connected to relay');

        const pubkey = getPublicKey(nsec);
        const fileUrl = `${host}${blossomHash}.txt`;
        
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['r', fileUrl]],
            content: `File uploaded: ${fileUrl}`,
        };
        
        const signedEvent = finalizeEvent(eventTemplate, nsec);
        
        // Publish with timeout
        console.log('Publishing event...');
        const publication = new Promise((resolve, reject) => {
            pool.publish([relay], signedEvent)
                .then(resolve)
                .catch(reject);
        });

        await Promise.race([
            publication,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Publication timeout after 30 seconds')), 30000)
            )
        ]);

        console.log('Event published successfully');
        core.setOutput('event-id', signedEvent.id);

    } catch (error) {
        console.error("Action failed:", error.message);
        core.setFailed(error.message);
    } finally {
        if (pool) {
            try {
                // Properly close the pool
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (pool.close && typeof pool.close === 'function') {
                    await pool.close();
                } else {
                    // Alternative closing method if pool.close is not available
                    const relays = Object.values(pool._relays || {});
                    await Promise.all(relays.map(relay => 
                        relay && relay.close ? relay.close() : Promise.resolve()
                    ));
                }
                console.log("Pool closed successfully");
            } catch (closeError) {
                console.error("Error closing pool:", closeError);
            }
        }
    }
}

// Error handler for unhandled promises
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    // Don't exit immediately to allow for cleanup
    setTimeout(() => process.exit(1), 1000);
});

run().then(() => {
    // Allow time for cleanup before exit
    setTimeout(() => process.exit(0), 1000);
}).catch((error) => {
    console.error("Run failed:", error);
    setTimeout(() => process.exit(1), 1000);
});
