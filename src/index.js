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
        
        // Add relay connection with timeout
        const relayConnection = pool.ensureRelay(relay);
        const connectionTimeout = 10000; // 10 seconds timeout
        
        await Promise.race([
            relayConnection,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Relay connection timeout')), connectionTimeout)
            )
        ]);

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
        const publishTimeout = 15000; // 15 seconds timeout
        const publication = pool.publish([relay], signedEvent);
        
        await Promise.race([
            publication,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Publication timeout')), publishTimeout)
            )
        ]);

        core.setOutput('event-id', signedEvent.id);

    } catch (error) {
        console.error("Action failed:", error);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        core.setFailed(error.message);
    } finally {
        if (pool) {
            try {
                // Give some time for pending operations to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                await Promise.all(pool.relays.map(relay => relay.close()));
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
    process.exit(1); // Ensure process exits on unhandled rejections
});

console.log("Starting run function...");
run().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error("Run failed:", error);
    process.exit(1);
});
