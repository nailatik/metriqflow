import { useState } from "react";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchReports, createReport, deleteReport } from "../../store/reportsSlice";
import Button from "../../ui/Button/Button";

const Reports = () => {
  const dispatch = useAppDispatch();

  const list = useAppSelector((s) => s.reports.list);
  const loading = useAppSelector((s) => s.settings.loading);
  const [newTitle, setNewTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (list.length === 0) {
      dispatch(fetchReports());
    }
  }, [dispatch, list.length]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await dispatch(createReport({ title: newTitle }));
    setNewTitle("");
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this report?")) {
      await dispatch(deleteReport(id));
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
          <Button onClick={handleCreate} disabled={loading || !newTitle.trim()}>
            Save
          </Button>
        </div>
      )}

      {list.length === 0 && !loading && (
        <div className="text-textSecondary">
          No reports yet
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">

        {list.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-border rounded-xl p-5 hover:shadow-md transition"
          >
            <h3 className="font-semibold">
              {report.title}
            </h3>

            <p className="text-textSecondary text-sm mt-2">
              Report ID: {report.id}
            </p>

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
};

export default Reports;