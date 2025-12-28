import { useState, useRef } from 'react';
import { uploadDocument, deleteDocument } from '../rag';
import { AttachmentIcon } from './Icons';
import './FileUpload.css';

function FileUpload({ userId, conversationId, documents, onDocumentsChange, theme }) {
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);

        for (const file of files) {
            try {
                const doc = await uploadDocument(userId, conversationId, file);
                onDocumentsChange([doc, ...documents]);
            } catch (error) {
                console.error('Failed to upload:', file.name, error);
                alert(`Failed to upload ${file.name}: ${error.message}`);
            }
        }

        setUploading(false);
    };

    const handleInputChange = (e) => {
        handleFileSelect(e.target.files);
        e.target.value = ''; // Reset input
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleDelete = async (doc) => {
        const success = await deleteDocument(doc.id, doc.file_path);
        if (success) {
            onDocumentsChange(documents.filter(d => d.id !== doc.id));
        }
    };

    const getFileIcon = (filename) => {
        if (filename.endsWith('.pdf')) return '📄';
        if (filename.endsWith('.txt')) return '📝';
        if (filename.endsWith('.md')) return '📋';
        if (filename.endsWith('.json')) return '📊';
        return '📎';
    };

    return (
        <div className={`file-upload-container ${theme}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.json"
                multiple
                onChange={handleInputChange}
                style={{ display: 'none' }}
            />

            <button
                className={`upload-trigger ${dragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                disabled={uploading}
            >
                <AttachmentIcon size={18} />
                <span>{dragging ? 'Drop files here' : 'Add files (PDF, TXT, MD)'}</span>
            </button>

            {uploading && (
                <div className="upload-progress">
                    <div className="upload-spinner"></div>
                    <span>Uploading & extracting text...</span>
                </div>
            )}

            {documents.length > 0 && (
                <div className="uploaded-docs">
                    {documents.map(doc => (
                        <div key={doc.id} className="doc-chip">
                            <span className="doc-icon">{getFileIcon(doc.filename)}</span>
                            <span className="doc-name">{doc.filename}</span>
                            <button
                                className="delete-btn"
                                onClick={() => handleDelete(doc)}
                                title="Remove file"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FileUpload;
