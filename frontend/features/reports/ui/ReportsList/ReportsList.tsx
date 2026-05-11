"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useReportsStore, useUiStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";

export const ReportsList = observer(() => {
  const t = useTranslations("Reports");
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
    if (confirm(t("confirmDelete"))) {
      await reportsStore.deleteReport(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          {t("create")}
        </Button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-4 flex gap-3">
          <input
            className="flex-1 px-4 py-2 border border-border rounded-xl outline-none focus:border-primary bg-bg text-textMain"
            placeholder={t("placeholder")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={uiStore.loading || !newTitle.trim()}>
            {t("save")}
          </Button>
        </div>
      )}

      {reportsStore.list.length === 0 && !uiStore.loading && (
        <p className="text-textSecondary">{t("empty")}</p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {reportsStore.list.map((report) => (
          <div
            key={report.id}
            className="bg-surface border border-border rounded-xl p-5 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-textMain">{report.title}</h3>
            <p className="text-textSecondary text-sm mt-2">{t("reportId", { id: report.id })}</p>
            <button
              onClick={() => handleDelete(report.id)}
              className="text-error text-sm mt-3 hover:underline"
            >
              {t("delete")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
