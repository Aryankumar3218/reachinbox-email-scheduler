import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { X, Upload, CheckCircle, FileText, Clock, ShieldAlert, Sparkles, Send } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
  onSchedule: (payload: any) => Promise<void>;
}

const DEFAULT_SENDERS = [
  'outreach@reachinbox.ai',
  'growth@outboxlabs.com',
  'partnerships@reachinbox.ai',
  'sales@reachinbox.ai',
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduledSuccess,
  onSchedule,
}) => {
  const [sender, setSender] = useState(DEFAULT_SENDERS[0]);
  const [customSender, setCustomSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipientsInput, setManualRecipientsInput] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    // Default to 1 minute from now for smooth scheduling demo
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(20);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // CSV / TXT parsing helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const foundEmails = new Set<string>();
          for (const row of results.data as any[]) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === 'string') {
                  const matches = cell.match(emailRegex);
                  if (matches) matches.forEach((m) => foundEmails.add(m.toLowerCase()));
                }
              }
            } else if (typeof row === 'object' && row !== null) {
              for (const key in row) {
                const val = row[key];
                if (typeof val === 'string') {
                  const matches = val.match(emailRegex);
                  if (matches) matches.forEach((m) => foundEmails.add(m.toLowerCase()));
                }
              }
            }
          }
          const list = Array.from(foundEmails);
          setRecipients(list);
          setManualRecipientsInput(list.join(', '));
        },
        error: (err) => {
          setError(`Failed parsing CSV: ${err.message}`);
        },
      });
    } else {
      // Text file parsing
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const matches = content.match(emailRegex) || [];
        const unique = Array.from(new Set(matches.map((e) => e.toLowerCase())));
        setRecipients(unique);
        setManualRecipientsInput(unique.join(', '));
      };
      reader.readAsText(file);
    }
  };

  const handleManualRecipientsChange = (value: string) => {
    setManualRecipientsInput(value);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = value.match(emailRegex) || [];
    setRecipients(Array.from(new Set(matches.map((e) => e.toLowerCase()))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeSender = sender === 'custom' ? customSender.trim() : sender;

    if (!activeSender || !activeSender.includes('@')) {
      setError('Please provide a valid sender email address.');
      return;
    }

    if (recipients.length === 0) {
      setError('Please upload leads or enter at least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setError('Please provide an email subject.');
      return;
    }

    if (!body.trim()) {
      setError('Please provide an email body.');
      return;
    }

    setSubmitting(true);
    try {
      await onSchedule({
        recipients,
        sender: activeSender,
        subject,
        body,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayBetweenSeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
      });

      onScheduledSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Compose & Schedule Outbound Campaign</h2>
              <p className="text-xs text-slate-400">Queue emails via BullMQ with automatic rate limiting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">From (Sender Account)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {DEFAULT_SENDERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="custom">Enter custom sender email...</option>
              </select>

              {sender === 'custom' && (
                <input
                  type="email"
                  placeholder="e.g. yourname@domain.com"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Lead Upload (CSV / TXT) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Upload Leads (CSV or TXT)
              </label>
              {recipients.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  <CheckCircle className="w-3 h-3" />
                  {recipients.length} valid email{recipients.length > 1 ? 's' : ''} detected
                </span>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-900/30 rounded-xl p-4 text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-6 h-6 mx-auto mb-1 text-slate-500 group-hover:text-indigo-400 transition" />
              <p className="text-xs text-slate-300 font-medium">
                {fileName ? (
                  <span className="text-indigo-300 flex items-center justify-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {fileName}
                  </span>
                ) : (
                  'Click to upload CSV or TXT lead list'
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically extracts and deduplicates all valid email addresses
              </p>
            </div>

            {/* Recipient Input / Edit */}
            <div className="mt-2">
              <textarea
                rows={2}
                placeholder="Or paste comma-separated emails: alex@acme.com, sarah@tech.io"
                value={manualRecipientsInput}
                onChange={(e) => handleManualRecipientsChange(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Subject Line</label>
            <input
              type="text"
              placeholder="e.g. Quick question regarding Outbox workflows..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Email Body</label>
            <textarea
              rows={4}
              placeholder="Hi there,&#10;&#10;I noticed your recent milestone and wanted to see if our automated cold email infrastructure could help accelerate outreach. Let me know if you have 5 minutes this week!&#10;&#10;Best regards,"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
              required
            />
          </div>

          {/* Scheduling & Rate Limiting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
            {/* Start Time */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Delay between emails */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Delay Between Sends (sec)
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Hourly Rate Limit */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Hourly Limit (emails/hr)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Scheduling...' : `Schedule ${recipients.length} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComposeModal;
