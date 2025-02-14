const core = require('@actions/core');
const { SimplePool } = require('nostr-tools');
const { getPublicKey, finalizeEvent } = require('nostr-tools/pure');
const WebSocket = require('ws');

async function run() {
    try {
        console.log("Starting Nostr announcement process...");
        
        const host = core.getInput('host', { required: true });
        const relay = core.getInput('relay', { required: true });
        console.log(`Got inputs - Host: ${host}, Relay: ${relay}`);
        
        const blossomHash = "c87e2ca771bab6024c269b933389d2a92d4941c848c52f155b9b84e1f109fe35";
        const nsec = "f77b10f372165652103bfccadcd32669135164025ef59e7c254e83730357f4d6";
        console.log("Using hardcoded blossomHash:", blossomHash);
        
        console.log("Creating SimplePool...");
        const pool = new SimplePool();
        
        // Get public key
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
        
        // Use finalizeEvent instead of separate hash and sign steps
        const signedEvent = finalizeEvent(eventTemplate, nsec);
        console.log("Finalized event:", JSON.stringify(signedEvent, null, 2));
        
        try {
            console.log(`Attempting to publish to relay: ${relay}`);
            
            const pub = await pool.publish([relay], signedEvent);
            console.log("Publish response:", pub);
            console.log("Published event:", signedEvent.id);
            
            // Wait a bit before closing the pool
            console.log("Waiting 5 seconds before closing pool...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            core.setOutput('event-id', signedEvent.id);
            console.log("Set output event-id:", signedEvent.id);
            
            await pool.close();
            console.log("Pool closed");
            
        } catch (pubError) {
            console.error("Publication error:", pubError);
            console.error("Full error details:", JSON.stringify(pubError, null, 2));
            core.setFailed(`Failed to publish to relay: ${pubError.message}`);
        }

    } catch (error) {
        console.error("Action failed:", error);
        console.error("Full error details:", JSON.stringify(error, null, 2));
        core.setFailed(error.message);
    }
}

// Add error handler for unhandled promises
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

console.log("Starting run function...");
run().then(() => {
    console.log("Run completed");
}).catch((error) => {
    console.error("Run failed:", error);
});
