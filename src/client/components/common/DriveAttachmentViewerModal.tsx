// OpsFlow 360 – Google Drive Attachment Viewer Component
// Built for viewing Drive files safely with owner contact & access request options

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Lock,
  Download,
  AlertTriangle,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface DriveAttachmentViewerModalProps {
  url: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  vendorName?: string;
  sheetNo?: string;
}

export const DriveAttachmentViewerModal: React.FC<DriveAttachmentViewerModalProps> = ({
  url,
  isOpen,
  onClose,
  title = 'Invoice / PO Attachment',
  vendorName,
  sheetNo,
}) => {
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  // Extract Drive File ID if applicable
  const extractDriveId = (link: string): string | null => {
    if (!link) return null;
    const matchId = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId) return matchId[1];
    const matchFileD = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFileD) return matchFileD[1];
    return null;
  };

  const driveId = extractDriveId(url);
  const isDriveUrl = url.includes('drive.google.com');

  const previewUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : url;

  const directViewUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing`
    : url;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directViewUrl || url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {sheetNo && (
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {sheetNo}
                  </span>
                )}
              </div>
              {vendorName && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                  Vendor: <span className="text-slate-800 font-semibold">{vendorName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy document link"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={directViewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open in Google Drive</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors ml-1"
              aria-label="Close document viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Owner Guidance Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-2.5 text-xs text-amber-900 flex items-start gap-2.5 shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Viewer Mode Notice:</span> File is hosted on Google Drive. If the preview displays{' '}
            <span className="font-semibold">&quot;You need access&quot;</span>, click{' '}
            <a
              href={directViewUrl}
              target="_blank"
              rel="noreferrer"
              className="underline font-bold text-amber-950 hover:text-indigo-700"
            >
              Open in Google Drive
            </a>{' '}
            to request access directly from the file owner, or sign in with your authorized Google account.
          </div>
        </div>

        {/* Document Viewer Frame */}
        <div className="flex-1 bg-slate-900/5 relative overflow-hidden flex items-center justify-center">
          {isDriveUrl ? (
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full border-0 bg-white"
              allow="autoplay"
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="p-8 text-center max-w-md">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">External Attachment</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This document is linked to an external URL. Click below to open in a new secure window.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700"
              >
                <span>View Attachment</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Read-Only Viewer • Protected Document</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={directViewUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
            >
              <span>Contact Owner / Request Access</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
