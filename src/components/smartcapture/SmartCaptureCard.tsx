import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { ClipboardContent } from '@/types';

interface SmartCaptureCardProps {
    clipboardData: ClipboardContent;
    onInsert: () => void;
    onDismiss: () => void;
    isDismissing?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
}

const SmartCaptureCard: React.FC<SmartCaptureCardProps> = ({
    clipboardData,
    onInsert,
    onDismiss,
    isDismissing = false,
    onExpand,
    onCollapse,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const { content, content_type, context } = clipboardData;

    const getContentIcon = () => {
        switch (content_type) {
            case 'Code': return '💻';
            case 'Url': return '🔗';
            default: return '📋';
        }
    };

    const getContentLabel = () => {
        switch (content_type) {
            case 'Code': return 'Code Snippet';
            case 'Url': return 'URL Link';
            default: return 'Text';
        }
    };

    const handleExpand = () => {
        const wasExpanded = isExpanded;
        setIsExpanded(!isExpanded);

        if (!wasExpanded && onExpand) {
            onExpand(); // Cancel timer when expanding
        } else if (wasExpanded && onCollapse) {
            onCollapse(); // Restart timer when collapsing
        }
    };

    const showExpandButton = content.length > 150;

    return (
        <div
            style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '360px',
                maxHeight: 'inherit',
                zIndex: 1000,
                transform: isVisible && !isDismissing ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
                opacity: isVisible && !isDismissing ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'inherit',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{getContentIcon()}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-primary)' }}>
                            Smart Capture
                        </span>
                        <span
                            style={{
                                fontSize: '11px',
                                color: 'var(--fg-tertiary)',
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                            }}
                        >
                            {getContentLabel()}
                        </span>
                    </div>
                    <button
                        onClick={onDismiss}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--fg-tertiary)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--fg-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--fg-tertiary)';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', flexShrink: 1, minHeight: 0, overflow: 'auto' }}>
                    {/* Context */}
                    {context && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                                padding: '10px 12px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <ExternalLink size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: 'var(--fg-primary)',
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginBottom: '2px',
                                    }}
                                >
                                    {context.app_name}
                                </div>
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--fg-secondary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {context.window_title}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content preview */}
                    <div
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            maxHeight: isExpanded ? '400px' : '200px',
                            overflow: isExpanded ? 'auto' : 'hidden',
                            position: 'relative',
                            padding: '12px 12px 0 12px',
                            marginBottom: '12px',
                        }}
                    >
                        <pre
                            style={{
                                margin: 0,
                                fontSize: '12px',
                                lineHeight: '1.6',
                                color: 'var(--fg-secondary)',
                                fontFamily: content_type === 'Code' ? 'monospace' : 'inherit',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {content}
                        </pre>

                        {/* Show more button with gradient shadow */}
                        {showExpandButton && !isExpanded && (
                            <div
                                style={{
                                    position: 'sticky',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    marginLeft: '-12px',
                                    marginRight: '-12px',
                                    marginBottom: '-12px',
                                    paddingTop: '30px',
                                    paddingBottom: '4px',
                                    paddingLeft: '12px',
                                    paddingRight: '12px',
                                    background: 'linear-gradient(to bottom, transparent 0%, #26262630 40%, #262626 100%)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <button
                                    onClick={handleExpand}
                                    style={{
                                        padding: '6px 14px',
                                        marginBottom: '8px',
                                        background: 'var(--bg-active)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        color: 'var(--fg-primary)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-primary)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-active)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <ChevronDown size={14} />
                                    Show more
                                </button>
                            </div>
                        )}

                        {/* Inline button when expanded - at end of content */}
                        {showExpandButton && isExpanded && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    margin: '8px 0',
                                }}
                            >
                                <button
                                    onClick={handleExpand}
                                    style={{
                                        padding: '6px 14px',
                                        background: 'var(--bg-active)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        color: 'var(--fg-primary)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-primary)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-active)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <ChevronUp size={14} />
                                    Show less
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div
                    style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        flexShrink: 0,
                    }}
                >
                    <button
                        onClick={onDismiss}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--fg-secondary)',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-active)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        }}
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={onInsert}
                        style={{
                            padding: '8px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            backgroundColor: 'var(--accent)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(21, 128, 61, 0.3)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(21, 128, 61, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--accent)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(21, 128, 61, 0.3)';
                        }}
                    >
                        <CheckCircle2 size={16} />
                        Insert
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartCaptureCard;
