"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const modules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'clean']
    ],
};

const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'color', 'background'
];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    return (
        <div className="bg-white text-black rounded-lg overflow-hidden">
            <style jsx global>{`
                .ql-toolbar {
                    background: #f3f4f6;
                    border-color: #e5e7eb !important;
                }
                .ql-container {
                    background: white;
                    font-size: 16px;
                    min-height: 150px;
                }
                .ql-editor {
                    min-height: 150px;
                }
            `}</style>
            <ReactQuill
                theme="snow"
                value={value || ''}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
            />
        </div>
    );
}
