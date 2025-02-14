const core = require('@actions/core');
const { SimplePool } = require('nostr-tools');
const { getPublicKey, finalizeEvent } = require('nostr-tools/pure');
const WebSocket = require('ws');

// Important: Set up WebSocket for nostr-tools
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
        
        const pubkey = getPublicKey(nsec);
        console.log("Generated pubkey:", pubkey);
        
        const fileUrl = `${host}${blossomHash}.txt`;
        console.log("File URL:", fileUrl);
        
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['r', fileUrl]],
            content: `File uploaded: ${fileUrl}`,
        };
        
        console.log("Created event template:", JSON.stringify(eventTemplate, null, 2));
        
        const signedEvent = finalizeEvent(eventTemplate, nsec);
        console.log("Finalized event:", JSON.stringify(signedEvent, null, 2));
        
        try {
            console.log(`Attempting to publish to relay: ${relay}`);
            
            // Wait for relay connection
            console.log("Waiting for relay connection...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            const pub = await pool.publish([relay], signedEvent);
            console.log("Published event:", signedEvent.id);
            
            // Wait for confirmation
            console.log("Waiting for confirmation...");
            await new Promise((resolve) => setTimeout(resolve, 3000));
            
            core.setOutput('event-id', signedEvent.id);
            console.log("Set output event-id:", signedEvent.id);
            
        } catch (pubError) {
            console.error("Publication error:", pubError);
            throw pubError;
        }

    } catch (error) {
        console.error("Action failed:", error);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        core.setFailed(error.message);
    } finally {
        if (pool) {
            try {
                console.log("Closing pool...");
                await pool.close();
                console.log("Pool closed successfully");
            } catch (closeError) {
                console.error("Error closing pool:", closeError);
            }
        }
    }
}

// Add error handler for unhandled promises
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

console.log("Starting run function...");
run().then(() => {
    console.log("Run completed successfully");
}).catch((error) => {
    console.error("Run failed:", error);
});
