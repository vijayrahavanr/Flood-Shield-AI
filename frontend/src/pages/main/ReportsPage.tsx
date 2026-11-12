import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { FileText, Download, Printer } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { selectedLocationId } = useAuth();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get(`/reports/generate?location_id=${selectedLocationId}`)
      .then((res) => setReport(res.data))
      .catch(() => {});
  }, [selectedLocationId]);

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Official Disaster &amp; Post-Flood Health Situation Reports (SitRep)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate, inspect, and export executive reports for NDMA, SDMA, and Public Health Directorates.
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  report.markdown_report,
                  `${report.report_id}.md`,
                  'text/markdown;charset=utf-8'
                )
              }
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Markdown (.md)
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  JSON.stringify(report, null, 2),
                  `${report.report_id}.json`,
                  'application/json'
                )
              }
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export JSON Data
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {report && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200 leading-relaxed bg-slate-950 p-5 rounded-xl border border-slate-800">
            {report.markdown_report}
          </pre>
        </div>
      )}
    </div>
  );
};
