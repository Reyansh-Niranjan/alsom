import { sendMessageToGroq, getMessagesByConversation, getUserMemory, updateUserMemory } from './chatbot';
import { searchDocuments } from './rag';

/**
 * Executes a specific tool requested by the AI
 */
async function executeTool(toolName, toolContent, userId, conversationId) {
    console.log(`Executing Tool: ${toolName} with content: "${toolContent}"`);

    try {
        switch (toolName.toLowerCase()) {
            case 'time':
                return new Date().toLocaleString();

            case 'docsearch':
            case 'doc_search': {
                // content is the query
                const docs = await searchDocuments(userId, toolContent, conversationId);
                if (docs.length === 0) return "No relevant documents found.";
                return docs.map(d => `[Source: ${d.filename}]\n${d.content.substring(0, 500)}...`).join('\n\n');
            }

            case 'history':
            case 'historysearch':
                try {
                    // Fetch actual chat history from Supabase
                    const allMessages = await getMessagesByConversation(conversationId);

                    // If specific query provided, filter by it
                    let relevantMsgs = allMessages;
                    if (toolContent && toolContent.trim().length > 0) {
                        const query = toolContent.toLowerCase();
                        relevantMsgs = allMessages.filter(m =>
                            (m.content && m.content.toLowerCase().includes(query)) ||
                            (m.role && m.role.toLowerCase().includes(query))
                        );
                    }

                    // If no matches found with query, fallback to recent history
                    let fallbackNote = "";
                    if (relevantMsgs.length === 0 && toolContent) {
                        relevantMsgs = allMessages;
                        fallbackNote = `No exact matches found for "${toolContent}". Showing recent conversation instead:\n`;
                    }

                    // Take last 15 messages to avoid huge context
                    const recentMsgs = relevantMsgs.slice(-15);

                    if (recentMsgs.length === 0) return "No history available yet.";

                    return fallbackNote + recentMsgs.map(m =>
                        `[${m.role.toUpperCase()}]: ${m.content.substring(0, 300)}` // Truncate long messages
                    ).join('\n');
                } catch (err) {
                    console.error('History tool error:', err);
                    return `History Error: ${err.message}`;
                }

            case 'websearch':
            case 'web_search':
                try {
                    // Check if Google Keys are available
                    const googleKey = import.meta.env.VITE_GOOGLE_API_KEY;
                    const googleCx = import.meta.env.VITE_GOOGLE_CX;

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
                        const topResults = wikiData.query.search.slice(0, 3).map(r =>
                            `[Title: ${r.title}]\nSnippet: ${r.snippet.replace(/<[^>]*>/g, '')}\nURL: https://en.wikipedia.org/?curid=${r.pageid}`
                        ).join('\n\n');
                        return `Found the following information on Wikipedia:\n${topResults}`;
                    } else {
                        return "No Wikipedia results found for this query.";
                    }
                } catch (e) {
                    console.error('WebSearch tool error:', e);
                    return `Web Search Error: ${e.message}`;
                }

            case 'userinfo':
            case 'user_info':
            case 'memory':
                if (!toolContent || toolContent.trim().length === 0 || toolContent.toLowerCase() === 'read') {
                    const memory = await getUserMemory(userId);
                    return memory ? `Current User Info: ${memory}` : "No user info stored yet.";
                } else {
                    const current = await getUserMemory(userId);
                    const updated = current ? `${current}\n- ${toolContent}` : `- ${toolContent}`;
                    await updateUserMemory(userId, updated);
                    return `Updated User Info. Current notes:\n${updated}`;
                }

            default:
                return `Tool "${toolName}" not found. Available tools: Time, DocSearch, History, WebSearch, UserInfo`;
        }
    } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error);
        return `Error executing ${toolName}: ${error.message}`;
    }
}

/**
 * Main Agent Loop
 * 1. Sends user message + system prompt to AI
 * 2. Parsers response for <TOOL> tags
 * 3. If tools found, executes them and loops back with results
 * 4. If <Response> found, returns final answer
 */
export async function runAgent(userId, conversationId, userMessage, hasDocuments, onToolCall) {
    const MAX_TURNS = 5;
    const MIN_CONTENT_LENGTH = 10; // Minimum length to consider content substantial
    let turn = 0;
    let lastToolCallSignature = null;

    // PRE-LOAD User Memory
    const userMemory = await getUserMemory(userId);
    const memoryContext = userMemory ? `\nUSER MEMORY (Remember this):\n${userMemory}\n` : "";

    // Initial Context
    let conversationContext = [
        {
            role: 'system',
            content: `You are an intelligent Agent with access to tools.
You have the following context:
- Document Uploaded: ${hasDocuments ? 'True' : 'False'}
${memoryContext}
AVAILABLE TOOLS:
1. <TOOL><Time></Time></TOOL> - Get current date and time.
2. <TOOL><DocSearch>query</DocSearch></TOOL> - Search uploaded documents.
3. <TOOL><History>query</History></TOOL> - Search chat history.
4. <TOOL><WebSearch>query</WebSearch></TOOL> - Search the web.
5. <TOOL><UserInfo>content</UserInfo></TOOL> - Read or Add to User Info/Memory. To READ, send empty content. To ADD, send the fact to remember.

PROTOCOL:
1. Think (<think>...</think>).
2. Call ONE tool (<TOOL>...</TOOL>).
3. Wait for result.
4. Final Answer (<Response>...</Response>).

IMPORTANT:
- If a tool returns "No results", DO NOT RETRY the same query. Try a DIFFERENT query or strategy immediately.
- Use <UserInfo> to remember important details about the user (name, preferences, etc).

STRICT RESTRICTIONS:
1. Always adhere to the user's instructions implicitly.
2. If the User Memory contains preferences (e.g. "Call me Boss"), follow them strictly.
3. Do not Hallucinate tool outputs. Only report what the tools return.
4. If a task is impossible, admit it. Do not fake a successful result.
`
        },
        { role: 'user', content: userMessage }
    ];

    while (turn < MAX_TURNS) {
        // Prepare context for API
        const flattenedPrompt = conversationContext.map(m =>
            `${m.role === 'user' ? 'User' : (m.role === 'system' ? 'System' : 'AI')}: ${m.content}`
        ).join('\n\n');

        // Call AI
        const aiResult = await sendMessageToGroq(flattenedPrompt, "");

        const aiText = aiResult.content; // Content + Thinking
        const aiThinking = aiResult.thinking;

        console.log(`[Agent Turn ${turn + 1}] AI Response:`, aiText.substring(0, 200));

        // Parse Output - Improved regex patterns
        let toolName = null;
        let toolContent = null;

        // Try multiple patterns for robustness
        // Pattern 1: <TOOL><ToolName>content</ToolName></TOOL>
        let toolMatch = aiText.match(/<TOOL>\s*<([a-zA-Z0-9_]+)>(.*?)<\/\1>\s*<\/TOOL>/s);
        
        // Pattern 2: More lenient - <TOOL><ToolName>content</TOOL>
        if (!toolMatch) {
            toolMatch = aiText.match(/<TOOL>\s*<([a-zA-Z0-9_]+)>(.*?)<\/TOOL>/s);
        }

        // Pattern 3: Even more lenient - just find tool tags
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

        // Priority: Execute tool first if found, then check for response
        if (toolName) {
            // Loop Prevention: Check if exact same tool call was just made
            const currentSignature = `${toolName}:${toolContent}`;
            if (lastToolCallSignature === currentSignature) {
                // Force break loop to avoid infinite recursion
                const warning = `You just called ${toolName} with "${toolContent}" and already got the result. Do not repeat the same invalid tool call. Stop and ask the user for clarification.`;
                conversationContext.push({ role: 'system', content: warning });
                turn++;
                continue;
            }
            lastToolCallSignature = currentSignature;

            // Callback for UI
            if (onToolCall) onToolCall(toolName, toolContent);

            const toolResult = await executeTool(toolName, toolContent, userId, conversationId);
            console.log(`[Agent Turn ${turn + 1}] Tool result: ${toolResult.substring(0, 100)}...`);

            // Add to history
            conversationContext.push({ role: 'assistant', content: aiText });
            conversationContext.push({ role: 'system', content: `Tool Result for ${toolName}: ${toolResult}` });

            turn++;
            continue;
        }

        // If Response tag found (and no tool was executed), return it
        if (responseMatch) {
            const finalContent = responseMatch[1].trim();
            console.log(`[Agent Turn ${turn + 1}] Final response provided`);
            return {
                content: finalContent,
                thinking: aiThinking
            };
        }

        // Fallback: No tool or response tag found
        // This might mean the AI provided a direct answer without wrapping it
        // Check if there's substantial content to return
        const cleanedContent = aiText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        if (cleanedContent.length > MIN_CONTENT_LENGTH) {
            // If AI provided a substantial response without proper tags, return it
            console.log(`[Agent Turn ${turn + 1}] No structured output, returning direct response`);
            return {
                content: cleanedContent,
                thinking: aiThinking
            };
        }

        // If we get here, the AI response was unclear/empty
        // Add a prompt to help the AI
        console.warn(`[Agent Turn ${turn + 1}] Unclear AI response, prompting for clarification`);
        conversationContext.push({ role: 'assistant', content: aiText });
        conversationContext.push({ 
            role: 'system', 
            content: 'Your previous response was unclear. Please provide either:\n1. A tool call in format: <TOOL><ToolName>query</ToolName></TOOL>\n2. OR a final response in format: <Response>your answer</Response>' 
        });
        
        turn++;
    }

    return { 
        content: "I apologize, but I'm having difficulty processing your request. Could you please rephrase or simplify your question?", 
        thinking: null 
    };
}
