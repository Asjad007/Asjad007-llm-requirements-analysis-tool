import { useMemo, useState } from "react";

function defaultNormalize(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function buildCsvValue(value) {
  const normalised = defaultNormalize(value).replace(/\r?\n/g, " ").trim();
  return `"${normalised.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, columns, rows) {
  const header = columns.map((column) => buildCsvValue(column.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((column) => {
        if (typeof column.exportValue === "function") {
          return buildCsvValue(column.exportValue(row));
        }

        if (typeof column.searchValue === "function") {
          return buildCsvValue(column.searchValue(row));
        }

        return buildCsvValue(row?.[column.key]);
      })
      .join(",")
  );

  const csvContent = [header, ...body].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function AppDataTable({
  columns = [],
  rows = [],
  rowKey,
  loading = false,
  searchPlaceholder = "Search records...",
  emptyMessage = "No records found",
  onRefresh,
  onExport,
  toolbarButtons = [],
  tableClassName = "",
  scrollClassName = "",
  containerClassName = "",
  footerLabel = "records",
  bodyHeight = "min(62vh, 720px)",
}) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) return rows;

    return rows.filter((row) =>
      columns.some((column) => {
        const searchableValue = typeof column.searchValue === "function"
          ? column.searchValue(row)
          : row?.[column.key];

        return defaultNormalize(searchableValue).toLowerCase().includes(trimmedQuery);
      })
    );
  }, [columns, query, rows]);

  const totalRecords = rows.length;
  const visibleRecords = filteredRows.length;
  const startRecord = visibleRecords > 0 ? 1 : 0;
  const endRecord = visibleRecords;
  const currentPage = totalRecords > 0 ? 1 : 0;
  const totalPages = totalRecords > 0 ? 1 : 0;

  function handleExport() {
    if (typeof onExport === "function") {
      onExport(filteredRows);
      return;
    }

    downloadCsv("table-export.csv", columns, filteredRows);
  }

  return (
    <div className={`app-data-table-shell ${containerClassName}`.trim()}>
      <div className="app-data-table-toolbar">
        <label className="app-data-table-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>

        <div className="app-data-table-toolbar-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={!onRefresh || loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleExport}
            disabled={loading || filteredRows.length === 0}
          >
            Export
          </button>
          {toolbarButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              className={button.className || "secondary-button"}
              onClick={button.onClick}
              disabled={button.disabled}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`app-data-table-scroll ${scrollClassName}`.trim()} style={{ maxHeight: bodyHeight }}>
        {loading ? (
          <div className="app-data-table-state">
            <span className="page-loading-spinner app-data-table-spinner" aria-hidden="true" />
            <p>Loading records...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="app-data-table-state">
            <p>{emptyMessage}</p>
            <button type="button" className="secondary-button" onClick={onRefresh} disabled={!onRefresh}>
              Refresh
            </button>
          </div>
        ) : (
          <table className={`app-data-table-grid ${tableClassName}`.trim()}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={column.headerClassName}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={typeof rowKey === "function" ? rowKey(row, index) : row?.[rowKey] ?? index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.cellClassName}
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {typeof column.render === "function"
                        ? column.render(row, index)
                        : defaultNormalize(row?.[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="app-data-table-footer">
        <span>
          Showing {startRecord}-{endRecord} of {totalRecords} {footerLabel}
        </span>
        <span>Current page: {currentPage}</span>
        <span>Total pages: {totalPages}</span>
      </div>
    </div>
  );
}
