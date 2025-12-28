import { supabase } from './chatbot';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText.trim();
}

/**
 * Extract text from a text-based file
 */
export async function extractTextFromFile(file) {
    const textTypes = ['text/plain', 'text/markdown', 'application/json'];

    if (file.type === 'application/pdf') {
        return await extractTextFromPDF(file);
    } else if (textTypes.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        return await file.text();
    } else {
        throw new Error('Unsupported file type');
    }
}

/**
 * Upload a file to Supabase Storage and save metadata
 */
export async function uploadDocument(userId, conversationId, file) {
    try {
        // Extract text content first
        const content = await extractTextFromFile(file);

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        // Save metadata to database
        const { data, error: dbError } = await supabase
            .from('documents')
            .insert([{
                user_id: userId,
                conversation_id: conversationId,
                filename: file.name,
                file_path: filePath,
                file_type: file.type || 'unknown',
                file_size: file.size,
                content: content
            }])
            .select()
            .single();

        if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
        }

        return data;
    } catch (error) {
        console.error('Error uploading document:', error);
        throw error;
    }
}

/**
 * Get all documents for a user (optionally filtered by conversation)
 */
export async function getDocuments(userId, conversationId = null) {
    let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (conversationId) {
        query = query.eq('conversation_id', conversationId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching documents:', error);
        return [];
    }

    return data || [];
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId, filePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (storageError) {
        console.error('Storage delete error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

    if (dbError) {
        console.error('Database delete error:', dbError);
        return false;
    }

    return true;
}

/**
 * Search documents for relevant context
 * Simple keyword-based search (free alternative to vector embeddings)
 */
export async function searchDocuments(userId, query, conversationId = null) {
    const documents = await getDocuments(userId, conversationId);

    if (documents.length === 0) return [];

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Score each document based on keyword matches
    const scoredDocs = documents.map(doc => {
        const content = (doc.content || '').toLowerCase();
        let score = 0;

        queryWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            const matches = content.match(regex);
            if (matches) {
                score += matches.length;
            }
        });

        return { ...doc, score };
    });

    // Return documents with matches, sorted by score
    return scoredDocs
        .filter(doc => doc.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Top 3 most relevant
}

/**
 * Build context string from relevant documents
 */
/**
 * Build context string from ALL documents (Full Text Mode)
 * User requested to remove RAG/Search and provide full raw access.
 */
export function buildFullContext(documents) {
    if (documents.length === 0) return '';

    let context = '\n\n---\n📎 ATTACHED DOCUMENTS (Full Content):\n\n';

    documents.forEach((doc, index) => {
        const content = doc.content || '';
        // We provide the FULL content now, no truncation unless it's astronomically large
        // But let's keep a sanity limit of ~50k chars per doc to avoid breaking the API completely
        // if the user uploads a book. 
        // User asked for "RAW text", so we try to give as much as possible.
        const effectiveContent = content.length > 100000 ? content.substring(0, 100000) + "\n...[Content truncated due to API limits]..." : content;

        context += `[File: ${doc.filename}]:\n${effectiveContent}\n\n`;
    });

    context += '---\n\nThe above are the full contents of the files uploaded by the user.\nYou have full access to this text. Use it to answer questions, analyze, or search for specific information as requested.\n\n';

    return context;
}
