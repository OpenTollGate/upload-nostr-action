const core = require('@actions/core');
import { SimplePool, getPublicKey, getEventHash, signEvent } from 'nostr-tools';
const WebSocket = require('ws');
const { nip19 } = require('nostr-tools');

async function run() {
    try {
        const host = core.getInput('host', { required: true });
        const relay = core.getInput('relay', { required: true });
        // const blossomHash = core.getInput('blossom-hash', { required: true });
        // const nsec = core.getInput('nsec', { required: true });
	const blossomHash = "c87e2ca771bab6024c269b933389d2a92d4941c848c52f155b9b84e1f109fe35"
        const nsec = "f77b10f372165652103bfccadcd32669135164025ef59e7c254e83730357f4d6"

        // Extract just the hash from the URL
        const hashMatch = blossomHash.match(/([a-f0-9]{64})/);
        const hash = hashMatch ? hashMatch[1] : blossomHash;

        console.log("Using hash:", hash);

        // Create a pool instead of RelayPool
        const pool = new SimplePool();
        
        const event = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [['r', `${host}${hash}.txt`]],
            content: `File uploaded: ${host}${hash}.txt`,
            pubkey: getPublicKey(nsec)
        };

        // Get the event hash
        event.id = getEventHash(event);
        
        // Sign the event
        event.sig = signEvent(event, nsec);

        try {
            // Publish to relay
            const pub = await pool.publish([relay], event);
            console.log("Published event:", event.id);
            core.setOutput('event-id', event.id);
            
            // Close the pool after publishing
            await pool.close();
        } catch (pubError) {
            console.error("Publication error:", pubError);
            core.setFailed(`Failed to publish to relay: ${pubError.message}`);
        }

    } catch (error) {
        console.error("Action failed:", error);
        core.setFailed(error.message);
    }
}

run();
