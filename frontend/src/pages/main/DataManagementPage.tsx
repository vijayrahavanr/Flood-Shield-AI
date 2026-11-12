import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { Database, FileSpreadsheet, Layers } from 'lucide-react';

export const DataManagementPage: React.FC = () => {
  const [dataInfo, setDataInfo] = useState<any>(null);

  useEffect(() => {
    apiClient
      .get('/data/datasets')
      .then((res) => setDataInfo(res.data))
      .catch(() => {});
  }, []);

  const datasets = dataInfo?.datasets || [];
  const counts = dataInfo?.database_table_counts || {};

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-cyan-400" /> Data Management, Sample Datasets &amp; GeoJSON Hub
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Inspect bundled training datasets, multi-basin GeoJSON layers, Sentinel-1/2 raster scenes, and relational database entity counts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {datasets.map((ds: any) => (
          <div
            key={ds.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                {ds.format}
              </span>
              <span className="text-slate-400">{ds.records} records</span>
            </div>
            <h3 className="text-sm font-bold text-white">{ds.name}</h3>
            <p className="text-slate-400">{ds.description}</p>
            <p className="font-mono text-[11px] text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800">
              {ds.path}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Relational Database Entity Counts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {Object.entries(counts).map(([tbl, cnt]: any) => (
            <div key={tbl} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <p className="text-slate-400 font-mono text-[11px]">{tbl}</p>
              <p className="text-xl font-extrabold text-emerald-300 mt-1">{cnt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
