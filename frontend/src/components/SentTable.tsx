import React from 'react';
import { EmailJob } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, AlertTriangle, ExternalLink, Search, RefreshCw, Send } from 'lucide-react';

interface SentTableProps {
  emails: EmailJob[];
  loading: boolean;
  total: number;
  page: number;
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
  onPageChange: (newPage: number) => void;
  totalPages: number;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  total,
  page,
  search,
  onSearchChange,
  onRefresh,
  onPageChange,
  totalPages,
}) => {
  return (
    <div className="space-y-4">
      {/* Search & Meta Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search recipient, subject, sender..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-400">
            Total Processed: <span className="font-semibold text-slate-200">{total}</span>
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm">Loading sent email history...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mb-3 text-emerald-400">
              <Send className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">No sent emails recorded</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {search
                ? `No emails match the query "${search}". Try adjusting your search term.`
                : 'Emails will appear here once processed by the BullMQ worker and sent via Ethereal SMTP.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Sender</th>
                  <th className="px-5 py-3.5">Sent Timestamp</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ethereal Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {emails.map((job) => {
                  const isSent = job.status === 'SENT';

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-5 py-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-300">{job.recipient}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300 max-w-xs truncate" title={job.subject}>
                        {job.subject}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                        {job.sender}
                      </td>
                      <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                        {job.sentAt ? (
                          format(new Date(job.sentAt), 'MMM dd, yyyy • hh:mm:ss a')
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Sent
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 cursor-help"
                            title={job.failureReason || 'Email delivery failed'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {job.etherealPreviewUrl ? (
                          <a
                            href={job.etherealPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1 rounded transition"
                            title="View fake sent email in Ethereal mailbox"
                          >
                            <span>View Email</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
            <span>
              Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition text-slate-200"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentTable;
