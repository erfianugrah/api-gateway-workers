import { DurableObject } from "cloudflare:workers";

/**
 * Env provides a mechanism to reference bindings declared in wrangler.jsonc within JavaScript
 *
 * @typedef {Object} Env
 * @property {DurableObjectNamespace} KEY_MANAGER - The Key Manager Durable Object namespace binding
 */

/**
 * @typedef {Object} ApiKey
 * @property {string} id - Unique identifier for the API key
 * @property {string} key - The actual API key value (hashed when stored)
 * @property {string} name - Human-readable name for the API key
 * @property {string} owner - Owner of the API key
 * @property {string[]} scopes - Array of permission scopes for this key
 * @property {string} status - Status of the key (active, revoked)
 * @property {number} createdAt - Timestamp when the key was created
 * @property {number} expiresAt - Timestamp when the key expires (0 for no expiration)
 * @property {number} lastUsedAt - Timestamp when the key was last used
 */

/**
 * Key Manager handles API key creation, validation, and management
 */
export class KeyManager extends DurableObject {
	/**
	 * Initialize the Key Manager
	 *
	 * @param {DurableObjectState} state - The interface for interacting with Durable Object state
	 * @param {Env} env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
	}

	/**
	 * Handle HTTP requests to the Key Manager
	 *
	 * @param {Request} request - The HTTP request
	 * @returns {Promise<Response>} The HTTP response
	 */
	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Basic CORS headers
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Content-Type': 'application/json'
		};

		// Handle preflight requests
		if (method === 'OPTIONS') {
			return new Response(null, { headers });
		}

		try {
			// API key management routes
			if (path === '/keys' && method === 'GET') {
				return await this.listKeys(headers);
			} else if (path === '/keys' && method === 'POST') {
				return await this.createKey(request, headers);
			} else if (path.startsWith('/keys/') && method === 'GET') {
				const keyId = path.split('/keys/')[1];
				return await this.getKey(keyId, headers);
			} else if (path.startsWith('/keys/') && method === 'DELETE') {
				const keyId = path.split('/keys/')[1];
				return await this.revokeKey(keyId, headers);
			} else if (path === '/validate' && method === 'POST') {
				return await this.validateKey(request, headers);
			} else {
				return new Response(JSON.stringify({ error: 'Not Found' }), {
					status: 404,
					headers
				});
			}
		} catch (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers
			});
		}
	}

	/**
	 * List all API keys
	 *
	 * @param {Object} headers - HTTP headers for the response
	 * @returns {Promise<Response>} List of API keys
	 */
	async listKeys(headers) {
		const keys = await this.state.storage.list({ prefix: 'key:' });
		const keyList = [];

		for (const [_, value] of keys) {
			const key = value;
			// Don't include the actual key in the response
			const { key: _, ...safeKey } = key;
			keyList.push(safeKey);
		}

		return new Response(JSON.stringify(keyList), { headers });
	}

	/**
	 * Create a new API key
	 *
	 * @param {Request} request - The HTTP request
	 * @param {Object} headers - HTTP headers for the response
	 * @returns {Promise<Response>} The newly created API key
	 */
	async createKey(request, headers) {
		const body = await request.json();
		
		// Validate required fields
		if (!body.name || !body.owner || !body.scopes) {
			return new Response(JSON.stringify({ error: 'Missing required fields: name, owner, scopes' }), {
				status: 400,
				headers
			});
		}

		// Generate a secure random API key
		const keyBuffer = new Uint8Array(32);
		crypto.getRandomValues(keyBuffer);
		const key = [...keyBuffer]
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('');
		
		// Create a unique ID for the key
		const id = crypto.randomUUID();
		
		const apiKey = {
			id,
			key,
			name: body.name,
			owner: body.owner,
			scopes: body.scopes,
			status: 'active',
			createdAt: Date.now(),
			expiresAt: body.expiresAt || 0,
			lastUsedAt: 0
		};

		// Store the API key
		await this.state.storage.put(`key:${id}`, apiKey);

		// Don't include the hashed key in the response
		const { key: _, ...safeKey } = apiKey;

		return new Response(JSON.stringify({
			...safeKey,
			key // Include the plain key in the response (only time it's returned)
		}), {
			status: 201,
			headers
		});
	}

	/**
	 * Get details for a specific API key
	 *
	 * @param {string} keyId - ID of the API key
	 * @param {Object} headers - HTTP headers for the response
	 * @returns {Promise<Response>} API key details
	 */
	async getKey(keyId, headers) {
		const apiKey = await this.state.storage.get(`key:${keyId}`);
		
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'API key not found' }), {
				status: 404,
				headers
			});
		}

		// Don't include the actual key in the response
		const { key, ...safeKey } = apiKey;

		return new Response(JSON.stringify(safeKey), { headers });
	}

	/**
	 * Revoke (delete) an API key
	 *
	 * @param {string} keyId - ID of the API key
	 * @param {Object} headers - HTTP headers for the response
	 * @returns {Promise<Response>} Confirmation of revocation
	 */
	async revokeKey(keyId, headers) {
		const apiKey = await this.state.storage.get(`key:${keyId}`);
		
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'API key not found' }), {
				status: 404,
				headers
			});
		}

		// Update the key status to revoked
		apiKey.status = 'revoked';
		await this.state.storage.put(`key:${keyId}`, apiKey);

		return new Response(JSON.stringify({ message: 'API key revoked successfully' }), { headers });
	}

	/**
	 * Validate an API key
	 *
	 * @param {Request} request - The HTTP request
	 * @param {Object} headers - HTTP headers for the response
	 * @returns {Promise<Response>} Validation result
	 */
	async validateKey(request, headers) {
		const body = await request.json();
		
		if (!body.key) {
			return new Response(JSON.stringify({ error: 'API key is required' }), {
				status: 400,
				headers
			});
		}

		const requiredScopes = body.scopes || [];

		// Lookup all keys to find one that matches the provided key
		const keys = await this.state.storage.list({ prefix: 'key:' });
		let foundKey = null;

		for (const [_, value] of keys) {
			if (value.key === body.key) {
				foundKey = value;
				break;
			}
		}

		if (!foundKey) {
			return new Response(JSON.stringify({ valid: false, error: 'Invalid API key' }), { headers });
		}

		// Check if the key is active
		if (foundKey.status !== 'active') {
			return new Response(JSON.stringify({ valid: false, error: 'API key is revoked' }), { headers });
		}

		// Check if the key has expired
		if (foundKey.expiresAt > 0 && foundKey.expiresAt < Date.now()) {
			return new Response(JSON.stringify({ valid: false, error: 'API key has expired' }), { headers });
		}

		// Check if the key has the required scopes
		const hasRequiredScopes = requiredScopes.every(scope => foundKey.scopes.includes(scope));
		if (requiredScopes.length > 0 && !hasRequiredScopes) {
			return new Response(JSON.stringify({ 
				valid: false, 
				error: 'API key does not have the required scopes',
				requiredScopes,
				providedScopes: foundKey.scopes
			}), { headers });
		}

		// Update last used timestamp
		foundKey.lastUsedAt = Date.now();
		await this.state.storage.put(`key:${foundKey.id}`, foundKey);

		return new Response(JSON.stringify({ 
			valid: true,
			owner: foundKey.owner,
			scopes: foundKey.scopes
		}), { headers });
	}
}

export default {
	/**
	 * Main fetch handler for the Worker
	 *
	 * @param {Request} request - The HTTP request
	 * @param {Env} env - The interface to reference bindings declared in wrangler.jsonc
	 * @param {ExecutionContext} ctx - The execution context of the Worker
	 * @returns {Promise<Response>} The HTTP response
	 */
	async fetch(request, env, ctx) {
		// Use the URL pathname as the namespace for the Key Manager instance
		const url = new URL(request.url);
		
		// Always use a consistent ID for the KEY_MANAGER to maintain state
		const id = env.KEY_MANAGER.idFromName('global');
		const keyManager = env.KEY_MANAGER.get(id);
		
		// Forward the request to the Durable Object
		return keyManager.fetch(request);
	},
};
