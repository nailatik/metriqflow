import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchReports } from "../../store/reportsSlice";
import Button from "../../ui/Button/Button";

const Reports = () => {
  const dispatch = useAppDispatch();

  const list = useAppSelector((s) => s.reports.list);
  const loading = useAppSelector((s) => s.settings.loading);
  useEffect(() => {
    dispatch(fetchReports());
  }, [dispatch]);

  return (
    <div className="space-y-8">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Reports</h1>

        <Button variant="primary">
          + Create report
        </Button>
      </div>

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
          </div>
        ))}

      </div>

    </div>
  );
};

export default Reports;