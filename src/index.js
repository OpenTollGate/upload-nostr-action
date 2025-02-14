const core = require('@actions/core');
const { SimplePool } = require('nostr-tools');
const { getPublicKey, finalizeEvent } = require('nostr-tools/pure');
const WebSocket = require('ws');
const { nip19 } = require('nostr-tools');

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
        
        // Connect and publish with timeout
        console.log(`Connecting to relay: ${relay}`);
        
        const pubkey = getPublicKey(nsec);
        const npub = nip19.npubEncode(pubkey);
        console.log("Publishing with public key:", pubkey);
        console.log("Nostr address (npub):", npub);
        
        const fileUrl = `${host}${blossomHash}.txt`;
        console.log("File URL to be announced:", fileUrl);
        
        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['r', fileUrl]],
            content: `File uploaded: ${fileUrl}`,
        };
        
        console.log("Event template:", JSON.stringify(eventTemplate, null, 2));
        
        const signedEvent = finalizeEvent(eventTemplate, nsec);
        console.log("Signed event:", JSON.stringify(signedEvent, null, 2));
        
        const noteId = nip19.noteEncode(signedEvent.id);
        console.log("Event ID:", signedEvent.id);
        console.log("Nostr note ID (note1):", noteId);
        
        // Publish with timeout
        console.log('Publishing event...');
        try {
            await Promise.race([
                pool.publish([relay], signedEvent),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Publication timeout after 30 seconds')), 30000)
                )
            ]);
            
            console.log('Event published successfully');
            console.log(`You can view this note at:
- Snort: https://snort.social/e/${noteId}
- Primal: https://primal.net/e/${noteId}
- Coracle: https://coracle.social/note/${signedEvent.id}`);
            
            core.setOutput('event-id', signedEvent.id);
        } catch (pubError) {
            throw new Error(`Failed to publish: ${pubError.message}`);
        }

    } catch (error) {
        console.error("Action failed:", error.message);
        core.setFailed(error.message);
    } finally {
        if (pool) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (pool._relays) {
                    for (const [_, relay] of Object.entries(pool._relays)) {
                        if (relay && typeof relay.close === 'function') {
                            await relay.close();
                        }
                    }
                }
                
                console.log("Pool cleaned up successfully");
            } catch (closeError) {
                console.error("Error during cleanup:", closeError);
            }
        }
    }
}

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    setTimeout(() => process.exit(1), 1000);
});

run().then(() => {
    setTimeout(() => process.exit(0), 1000);
}).catch((error) => {
    console.error("Run failed:", error);
    setTimeout(() => process.exit(1), 1000);
});
