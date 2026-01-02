/**
 * Vercel Serverless Function: /api/chat
 * 
 * Accepts POST requests with:
 * - site: string (identifier for the calling site)
 * - session_id: string (for threading conversations)
 * - messages: array of { role, content }
 * - tools: optional array of tool names to enable
 * 
 * Returns:
 * - reply: model text response
 * - tool_calls: array of tool calls if any were made
 * - usage: token usage info
 * - debug: optional debug information
 */

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Available tools configuration
const AVAILABLE_TOOLS = {
    time: {
        name: 'time',
        description: 'Get current date and time'
    },
    websearch: {
        name: 'websearch',
        description: 'Search the web using Wikipedia'
    }
};

/**
 * Execute a tool and return its result
 */
async function executeTool(toolName, toolContent) {
    console.log(`Executing Tool: ${toolName} with content: "${toolContent}"`);

    try {
        switch (toolName.toLowerCase()) {
            case 'time':
                return new Date().toLocaleString();

            case 'websearch':
            case 'web_search':
                try {
                    // Check if Google Keys are available
                    const googleKey = process.env.GOOGLE_API_KEY;
                    const googleCx = process.env.GOOGLE_CX;

                    if (googleKey && googleCx) {
                        try {
                            const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(toolContent)}`;
                            const gResponse = await fetch(googleUrl);
                            const gData = await gResponse.json();

                            if (gData.items && gData.items.length > 0) {
                                const topResults = gData.items.slice(0, 3).map(r =>
                                    `[Title: ${r.title}]\nSnippet: ${r.snippet}\nURL: ${r.link}`
                                ).join('\n\n');
                                return `Found the following information on Google:\n${topResults}`;
                            }
                        } catch (gErr) {
                            console.error("Google Search Failed", gErr);
                        }
                    }

                    // Use Wikipedia as a free, CORS-friendly web search alternative
                    const wikiResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(toolContent)}&format=json&origin=*`);
                    const wikiData = await wikiResponse.json();

                    if (wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
                        const topResults = wikiData.query.search.slice(0, 3).map(r => {
                            // More robust HTML sanitization
                            let cleanSnippet = r.snippet;
                            let prevSnippet = '';
                            while (cleanSnippet !== prevSnippet) {
                                prevSnippet = cleanSnippet;
                                cleanSnippet = cleanSnippet.replace(/<[^>]*>/g, '');
                            }
                            cleanSnippet = cleanSnippet.replace(/[<>]/g, '');

                            return `[Title: ${r.title}]\nSnippet: ${cleanSnippet}\nURL: https://en.wikipedia.org/?curid=${r.pageid}`;
                        }).join('\n\n');
                        return `Found the following information on Wikipedia:\n${topResults}`;
                    } else {
                        return "No Wikipedia results found for this query.";
                    }
                } catch (e) {
                    console.error('WebSearch tool error:', e);
                    return `Web Search Error: ${e.message}`;
                }

            default:
                return `Tool "${toolName}" not available. Available tools: Time, WebSearch`;
        }
    } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error);
        return `Error executing ${toolName}: ${error.message}`;
    }
}

/**
 * Call Groq API for chat completions
 */
async function callGroqAPI(messages) {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_KEY}`,
                },
                body: JSON.stringify({
                    model: 'qwen/qwen3-32b',
                    messages: messages,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle Rate Limit specifically
                if (response.status === 429) {
                    const retryAfter = data.error?.message?.match(/try again in ([\d.]+)s/)?.[1] ||
                        data.error?.message?.match(/try again in ([\d.]+)ms/)?.[1] / 1000 ||
                        2;

                    console.warn(`Rate limit hit (Attempt ${attempt + 1}). Retrying in ${retryAfter}s...`);
                    await delay(Math.ceil(retryAfter * 1000) + 100);
                    attempt++;
                    continue;
                }

                return {
                    error: data.error?.message || 'Failed to get response from AI.',
                    status: response.status
                };
            }

            const content = data.choices?.[0]?.message?.content || 'No response';
            const usage = data.usage || {};

            // Parse thinking tags
            const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
            const thinking = thinkMatch ? thinkMatch[1].trim() : null;
            const cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

            return {
                content: cleanContent,
                thinking: thinking,
                usage: usage,
                raw: content
            };

        } catch (error) {
            console.error('Network Error:', error);
            if (attempt === MAX_RETRIES - 1) {
                return { error: "Network error: Unable to reach AI service." };
            }
            attempt++;
            await delay(1000);
        }
    }

    return { error: "Max retries exceeded" };
}

/**
 * Main agent loop with tool execution
 */
async function runAgentLoop(messages, enabledTools = [], maxTurns = 5) {
    const toolCalls = [];
    let lastToolCallSignature = null;

    // Build available tools string based on enabled tools
    let toolsDescription = 'AVAILABLE TOOLS:\n';
    const toolsList = enabledTools.length > 0 ? enabledTools : Object.keys(AVAILABLE_TOOLS);

    toolsList.forEach((toolName, index) => {
        const tool = AVAILABLE_TOOLS[toolName.toLowerCase()];
        if (tool) {
            if (toolName.toLowerCase() === 'time') {
                toolsDescription += `${index + 1}. <TOOL><Time></Time></TOOL> - Get current date and time.\n`;
            } else if (toolName.toLowerCase() === 'websearch' || toolName.toLowerCase() === 'web_search') {
                toolsDescription += `${index + 1}. <TOOL><WebSearch>query</WebSearch></TOOL> - Search the web.\n`;
            }
        }
    });

    // Build system message
    const systemMessage = {
        role: 'system',
        content: `You are an intelligent Agent with access to tools.

${toolsDescription}

PROTOCOL:
1. Think (<think>...</think>).
2. Call ONE tool (<TOOL>...</TOOL>) if needed.
3. Wait for result.
4. Final Answer (<Response>...</Response>).

IMPORTANT:
- If a tool returns "No results", DO NOT RETRY the same query. Try a DIFFERENT query or strategy immediately.

STRICT RESTRICTIONS:
1. Always adhere to the user's instructions implicitly.
2. Do not Hallucinate tool outputs. Only report what the tools return.
3. If a task is impossible, admit it. Do not fake a successful result.
`
    };

    // Prepend system message to conversation
    let conversationContext = [systemMessage, ...messages];
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    for (let turn = 0; turn < maxTurns; turn++) {
        // Call AI
        const aiResult = await callGroqAPI(conversationContext);

        if (aiResult.error) {
            return {
                reply: aiResult.error,
                tool_calls: toolCalls,
                usage: totalUsage,
                error: true
            };
        }

        // Accumulate usage
        if (aiResult.usage) {
            totalUsage.prompt_tokens += aiResult.usage.prompt_tokens || 0;
            totalUsage.completion_tokens += aiResult.usage.completion_tokens || 0;
            totalUsage.total_tokens += aiResult.usage.total_tokens || 0;
        }

        const aiText = aiResult.content;
        console.log(`[Agent Turn ${turn + 1}] AI Response:`, aiText.substring(0, 200));

        // Parse for tool calls
        let toolName = null;
        let toolContent = null;

        // Pattern 1: <TOOL><ToolName>content</ToolName></TOOL>
        let toolMatch = aiText.match(/<TOOL>\s*<([a-zA-Z0-9_]+)>(.*?)<\/\1>\s*<\/TOOL>/s);

        // Pattern 2: More lenient - <TOOL><ToolName>content</TOOL>
        if (!toolMatch) {
            toolMatch = aiText.match(/<TOOL>\s*<([a-zA-Z0-9_]+)>(.*?)<\/TOOL>/s);
        }

        // Pattern 3: Even more lenient
        if (!toolMatch) {
            const toolStartMatch = aiText.match(/<TOOL>\s*<([a-zA-Z0-9_]+)>/);
            if (toolStartMatch) {
                const toolTagName = toolStartMatch[1];
                const contentMatch = aiText.match(new RegExp(`<${toolTagName}>(.*?)</${toolTagName}>`, 's'));
                if (contentMatch) {
                    toolMatch = [null, toolTagName, contentMatch[1]];
                }
            }
        }

        if (toolMatch) {
            toolName = toolMatch[1];
            toolContent = (toolMatch[2] || '').trim();
            console.log(`[Agent Turn ${turn + 1}] Tool detected: ${toolName} with content: "${toolContent}"`);
        }

        const responseMatch = aiText.match(/<Response>([\s\S]*?)<\/Response>/);

        // Execute tool if found
        if (toolName) {
            // Loop Prevention
            const currentSignature = `${toolName}:${toolContent}`;
            if (lastToolCallSignature === currentSignature) {
                const warning = `You just called ${toolName} with "${toolContent}" and already got the result. Do not repeat the same tool call.`;
                conversationContext.push({ role: 'assistant', content: aiText });
                conversationContext.push({ role: 'system', content: warning });
                continue;
            }
            lastToolCallSignature = currentSignature;

            // Check if tool is enabled
            const isToolEnabled = toolsList.some(t => t.toLowerCase() === toolName.toLowerCase());
            let toolResult;

            if (isToolEnabled) {
                toolResult = await executeTool(toolName, toolContent);
            } else {
                toolResult = `Tool "${toolName}" is not enabled for this request.`;
            }

            // Record tool call
            toolCalls.push({
                tool: toolName,
                input: toolContent,
                output: toolResult
            });

            console.log(`[Agent Turn ${turn + 1}] Tool result: ${toolResult.substring(0, 100)}...`);

            // Add to context
            conversationContext.push({ role: 'assistant', content: aiText });
            conversationContext.push({ role: 'system', content: `Tool Result for ${toolName}: ${toolResult}` });

            continue;
        }

        // If Response tag found, return it
        if (responseMatch) {
            const finalContent = responseMatch[1].trim();
            return {
                reply: finalContent,
                tool_calls: toolCalls,
                usage: totalUsage
            };
        }

        // Fallback: No tool or response tag found
        const cleanedContent = aiText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (cleanedContent.length > 10) {
            return {
                reply: cleanedContent,
                tool_calls: toolCalls,
                usage: totalUsage
            };
        }

        // Prompt AI for clarification
        conversationContext.push({ role: 'assistant', content: aiText });
        conversationContext.push({
            role: 'system',
            content: 'Your previous response was unclear. Please provide either:\n1. A tool call in format: <TOOL><ToolName>query</ToolName></TOOL>\n2. OR a final response in format: <Response>your answer</Response>'
        });
    }

    return {
        reply: "I apologize, but I'm having difficulty processing your request. Could you please rephrase or simplify your question?",
        tool_calls: toolCalls,
        usage: totalUsage
    };
}

/**
 * Main handler for the /api/chat endpoint
 */
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // Validate API key is configured
    if (!process.env.GROQ_KEY) {
        return res.status(500).json({ error: 'Server configuration error: GROQ_KEY not set' });
    }

    try {
        const { site, session_id, messages, tools } = req.body;

        // Validate required fields
        if (!site || typeof site !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "site" field' });
        }

        if (!session_id || typeof session_id !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid "session_id" field' });
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid "messages" field. Must be a non-empty array.' });
        }

        // Validate message format
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                return res.status(400).json({ error: 'Each message must have "role" and "content" fields' });
            }
            if (!['user', 'assistant', 'system'].includes(msg.role)) {
                return res.status(400).json({ error: 'Message role must be "user", "assistant", or "system"' });
            }
        }

        // Validate tools if provided
        const enabledTools = tools || [];
        if (tools && !Array.isArray(tools)) {
            return res.status(400).json({ error: '"tools" must be an array if provided' });
        }

        console.log(`[API /chat] Request from site: ${site}, session: ${session_id}, messages: ${messages.length}, tools: ${enabledTools.length || 'default'}`);

        // Run the agent loop
        const result = await runAgentLoop(messages, enabledTools);

        // Return response
        return res.status(200).json({
            reply: result.reply,
            tool_calls: result.tool_calls,
            usage: result.usage,
            debug: {
                site: site,
                session_id: session_id,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[API /chat] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
