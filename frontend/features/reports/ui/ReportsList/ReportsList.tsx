"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useReportsStore, useUiStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";

export const ReportsList = observer(() => {
  const reportsStore = useReportsStore();
  const uiStore = useUiStore();
  const [newTitle, setNewTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (reportsStore.list.length === 0) {
      reportsStore.fetchReports();
    }
  }, [reportsStore]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await reportsStore.createReport({ title: newTitle });
    setNewTitle("");
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this report?")) {
      await reportsStore.deleteReport(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          + Create report
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-border rounded-xl p-4 flex gap-3">
          <input
            className="flex-1 px-4 py-2 border border-border rounded-xl outline-none focus:border-primary"
            placeholder="Report title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={uiStore.loading || !newTitle.trim()}>
            Save
          </Button>
        </div>
      )}

      {reportsStore.list.length === 0 && !uiStore.loading && (
        <p className="text-textSecondary">No reports yet</p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {reportsStore.list.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition"
          >
            <h3 className="font-semibold">{report.title}</h3>
            <p className="text-textSecondary text-sm mt-2">Report ID: {report.id}</p>
            <button
              onClick={() => handleDelete(report.id)}
              className="text-red-500 text-sm mt-3 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
