import { useState, useEffect, useRef } from "react";

/**
 * Modal component for sharing tutorial public URLs when published
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Callback when modal is closed
 * @param {string} props.tutorialId - The tutorial ID
 * @param {string} props.tutorialTitle - The tutorial title
 */
export default function ShareModal({ isOpen, onClose, tutorialId, tutorialTitle }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  
  // get the public URL from WordPress config
  const getPublicUrl = () => {
    const config = window.gotsConfig || {};
    const siteUrl = config.siteUrl || window.location.origin;
    return `${siteUrl}/gots/play/${tutorialId}`;
  };
  
  const publicUrl = getPublicUrl();
  
  // reset copied state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      // select the input text when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen]);
  
  // handle escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Share Tutorial</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        
        <div style={styles.body}>
          <p style={styles.tutorialName}>{tutorialTitle}</p>
          <p style={styles.description}>
            Copy the link below to share this tutorial with students:
          </p>
          
          <div style={styles.urlContainer}>
            <input
              ref={inputRef}
              type="text"
              value={publicUrl}
              readOnly
              style={styles.urlInput}
              onClick={(e) => e.target.select()}
            />
            <button 
              style={{
                ...styles.copyButton,
                ...(copied ? styles.copyButtonSuccess : {})
              }}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
          
          <p style={styles.note}>
            This link is publicly accessible. Only published tutorials can be viewed.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '500px',
    margin: '20px',
    animation: 'fadeIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  body: {
    padding: '24px',
  },
  tutorialName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0',
  },
  urlContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  urlInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#f9fafb',
    color: '#374151',
    outline: 'none',
  },
  copyButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: '#7B2D26',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
  copyButtonSuccess: {
    backgroundColor: '#059669',
  },
  note: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
    fontStyle: 'italic',
  },
};
