'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';

type AuditRow = {
  test_date: string;
  model: string;
  category: string;
  verdict: string;
  cost?: number;
  latency_ms?: number;
  prompt_text: string;
  response_text: string;
};

type ModelMetadata = {
  id: string;
  name: string;
  provider: string;
  region: string;
  tier: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [models, setModels] = useState<ModelMetadata[]>([]);

  useEffect(() => {
    // Load model metadata
    fetch('/models.json')
      .then((r) => r.json())
      .then((meta) => setModels(meta))
      .catch((e) => console.error('Failed to load models.json', e));

    // Load audit log CSV
    fetch('/audit_log.csv')
      .then((r) => r.text())
      .then((csv) => {
        const parsed = Papa.parse<AuditRow>(csv, { header: true, dynamicTyping: true });
        setData(parsed.data.filter((row) => row.model));
      })
      .catch((e) => console.error('Failed to load audit_log.csv', e));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Moderation Dashboard</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Models</h2>
        <ul className="list-disc pl-5 space-y-1">
          {models.map((m) => (
            <li key={m.id}>
              {m.name} ({m.provider}) – {m.region} – {m.tier} tier
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Audit Log (first 100 rows)</h2>
        <table className="w-full table-auto border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Date</th>
              <th className="border p-2">Model</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Verdict</th>
              <th className="border p-2">Prompt</th>
              <th className="border p-2">Response</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 100).map((row, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                <td className="border p-2 text-sm">{row.test_date}</td>
                <td className="border p-2 text-sm">{row.model}</td>
                <td className="border p-2 text-sm">{row.category}</td>
                <td className="border p-2 text-sm">{row.verdict}</td>
                <td className="border p-2 text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {row.prompt_text}
                </td>
                <td className="border p-2 text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {row.response_text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-gray-600">Showing first {Math.min(100, data.length)} rows.</p>
      </section>
    </main>
  );
}
