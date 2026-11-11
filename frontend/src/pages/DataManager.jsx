import React, { useEffect, useState } from 'react';
import { dataManagerApi } from '../api/datamanager';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  FileText, 
  ShieldAlert,
  History,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function DataManager({ user }) {
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'maintenance' | 'audit'

  // Tables State
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('employees');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Query Params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // Row Add / Edit Modal
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null); // null if create, row object if edit
  const [rowFormData, setRowFormData] = useState({});
  const [rowModalError, setRowModalError] = useState('');
  const [rowModalLoading, setRowModalLoading] = useState(false);

  // Row Delete Confirm
  const [deleteRowId, setDeleteRowId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Restore Modal
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  // Reset Confirm Dialog
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      loadTableData();
    }
  }, [selectedTable, page, pageSize, sortBy, sortDir]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, auditActionFilter]);

  const loadTables = async () => {
    try {
      const data = await dataManagerApi.getTables();
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTableData = async () => {
    setLoading(true);
    try {
      const res = await dataManagerApi.queryTable({
        table_name: selectedTable,
        page,
        page_size: pageSize,
        search: searchTerm || undefined,
        sort_by: sortBy || undefined,
        sort_dir: sortDir,
      });
      setTableData(res);
    } catch (err) {
      alert(err.message || 'Failed to query table data.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await dataManagerApi.getAuditLogs({
        action: auditActionFilter || undefined,
        limit: 100,
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadTableData();
  };

  const handleSortToggle = (colName) => {
    if (sortBy === colName) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colName);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Open Create Row
  const handleOpenCreateRow = () => {
    setEditingRow(null);
    setRowModalError('');
    const initial = {};
    if (tableData?.columns) {
      tableData.columns.forEach(col => {
        if (!col.primary_key) {
          initial[col.name] = '';
        }
      });
    }
    setRowFormData(initial);
    setIsRowModalOpen(true);
  };

  // Open Edit Row
  const handleOpenEditRow = (row) => {
    setEditingRow(row);
    setRowModalError('');
    setRowFormData({ ...row });
    setIsRowModalOpen(true);
  };

  // Save Row (Create or Update)
  const handleSaveRow = async (e) => {
    e.preventDefault();
    setRowModalLoading(true);
    setRowModalError('');
    try {
      if (editingRow) {
        const pkCol = tableData.columns.find(c => c.primary_key);
        const pkVal = editingRow[pkCol.name];
        await dataManagerApi.updateRow(selectedTable, pkVal, rowFormData);
      } else {
        await dataManagerApi.addRow(selectedTable, rowFormData);
      }
      setIsRowModalOpen(false);
      loadTableData();
      loadTables(); // Refresh row counts
    } catch (err) {
      setRowModalError(err.message || 'Failed to save row.');
    } finally {
      setRowModalLoading(false);
    }
  };

  // Delete Row
  const handleDeleteRow = async () => {
    if (!deleteRowId) return;
    setDeleteLoading(true);
    try {
      await dataManagerApi.deleteRow(selectedTable, deleteRowId);
      setDeleteRowId(null);
      loadTableData();
      loadTables();
    } catch (err) {
      alert(err.message || 'Failed to delete row.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export
  const handleExport = async (format) => {
    try {
      const blob = await dataManagerApi.exportTable(selectedTable, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Export failed.');
    }
  };

  // Import
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await dataManagerApi.importTable(selectedTable, importFile);
      setImportResult(res);
      loadTableData();
      loadTables();
    } catch (err) {
      alert(err.message || 'Import failed.');
    } finally {
      setImportLoading(false);
    }
  };

  // Backup Download
  const handleDownloadBackup = async () => {
    try {
      const blob = await dataManagerApi.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hrportal_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Backup failed.');
    }
  };

  // Restore Submit
  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const res = await dataManagerApi.restoreDatabase(restoreFile);
      setRestoreResult(res);
      loadTables();
      loadTableData();
    } catch (err) {
      alert(err.message || 'Restore failed.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Reset to Sample Data
  const handleResetDatabase = async () => {
    setResetLoading(true);
    try {
      await dataManagerApi.resetToSampleData();
      setIsResetConfirmOpen(false);
      alert('Database reset to enterprise sample data successfully.');
      loadTables();
      loadTableData();
    } catch (err) {
      alert(err.message || 'Reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  const currentTableMeta = tables.find(t => t.name === selectedTable);
  const pkColumnName = tableData?.columns?.find(c => c.primary_key)?.name || 'id';

  return (
    <div>
      {/* Top Header / Tab Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>
                System Data Manager
              </h2>
              <Badge variant="solid">ADMIN ONLY</Badge>
            </div>
            <p className="muted" style={{ marginTop: '2px' }}>
              Direct database table management, backups, CSV/JSON migrations, and audit trails
            </p>
          </div>

          <div className="tab-nav" style={{ margin: 0, border: 'none' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              Table Browser
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              Backup & Maintenance
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              Audit Log Trail
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Table Browser */}
      {activeTab === 'tables' && (
        <>
          {/* Table Selector & Search/Action Bar */}
          <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Table Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Table:</label>
                <select
                  className="form-select"
                  style={{ width: 'auto', fontWeight: 600, height: '34px', fontSize: '13px' }}
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setPage(1);
                    setSearchTerm('');
                    setSortBy('');
                  }}
                >
                  {tables.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.row_count} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Search in Table */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ height: '34px', fontSize: '13px' }}
                  placeholder={`Search ${selectedTable}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm">Search</button>
              </form>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenCreateRow}
                >
                  <Plus size={14} />
                  <span>Add Row</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExport('csv')}
                  title="Export table as CSV"
                >
                  <Download size={14} />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExport('json')}
                  title="Export table as JSON"
                >
                  <Download size={14} />
                  <span>JSON</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setImportFile(null);
                    setImportResult(null);
                    setIsImportOpen(true);
                  }}
                >
                  <Upload size={14} />
                  <span>Import</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Data View */}
          {loading ? (
            <LoadingSkeleton type="table" rows={8} />
          ) : !tableData || tableData.rows.length === 0 ? (
            <EmptyState
              icon={Database}
              title={`No rows in '${selectedTable}'`}
              description="This database table is currently empty or no rows match your search."
              actionLabel="Insert Row"
              onAction={handleOpenCreateRow}
            />
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: '6px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {tableData.columns.map(col => (
                        <th 
                          key={col.name}
                          onClick={() => handleSortToggle(col.name)}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          title={`Sort by ${col.name}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{col.name}</span>
                            {col.primary_key && (
                              <span style={{ fontSize: '9px', border: '1px solid #737373', borderRadius: '2px', padding: '0 2px' }}>PK</span>
                            )}
                            {sortBy === col.name && (
                              <span style={{ fontSize: '10px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, idx) => {
                      const rowPk = row[pkColumnName];
                      return (
                        <tr key={idx}>
                          {tableData.columns.map(col => {
                            const val = row[col.name];
                            return (
                              <td key={col.name} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {val === null ? (
                                  <span style={{ color: '#A3A3A3', fontStyle: 'italic', fontSize: '11px' }}>NULL</span>
                                ) : typeof val === 'boolean' ? (
                                  <Badge variant={val ? 'approved' : 'rejected'}>{val ? 'TRUE' : 'FALSE'}</Badge>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px' }}
                                onClick={() => handleOpenEditRow(row)}
                                title="Edit Row"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px' }}
                                onClick={() => setDeleteRowId(rowPk)}
                                title="Delete Row"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #E5E5E5',
                fontSize: '13px',
                color: '#525252'
              }}>
                <div>
                  Showing {tableData.rows.length} of {tableData.total} rows (Page {tableData.page} of {tableData.total_pages})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={30}>30 rows</option>
                    <option value={50}>50 rows</option>
                  </select>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page >= tableData.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Maintenance (Backup / Restore / Reset) */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Backup Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 className="card-title">Database Snapshot Backup</h3>
                <p className="muted" style={{ marginTop: '2px' }}>
                  Download a complete, transactional SQLite copy of the current database file (/data/hrportal.db).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadBackup}
              >
                <Download size={15} />
                <span>Download Database (.db)</span>
              </button>
            </div>
          </div>

          {/* Restore Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Restore Database from Backup</h3>
                <p className="muted" style={{ marginTop: '2px' }}>
                  Upload a validated SQLite database backup file. Schema and table integrity are checked before replacement.
                </p>
              </div>
            </div>

            {restoreResult && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {restoreResult.message}
              </div>
            )}

            <form onSubmit={handleRestoreSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="file"
                className="form-input"
                style={{ width: 'auto', flex: 1 }}
                accept=".db,.sqlite,.sqlite3"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                required
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={restoreLoading || !restoreFile}
              >
                {restoreLoading ? 'Validating & Restoring...' : 'Restore File'}
              </button>
            </form>
          </div>

          {/* Reset to Sample Data Card */}
          <div className="card" style={{ border: '1px solid #0A0A0A' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#0A0A0A" />
                  <h3 className="card-title">Reset to Clean Sample Data</h3>
                </div>
                <p className="muted" style={{ marginTop: '4px' }}>
                  Wipe current database and regenerate 24 realistic Indian enterprise employee records, 4 departments, 3 months of attendance, and sample leave records.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setIsResetConfirmOpen(true)}
              >
                <RotateCcw size={15} />
                <span>Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Administrative Audit Log</h3>
              <p className="muted" style={{ marginTop: '2px' }}>Immutable ledger tracking who modified what, when, and changes made</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Action:</label>
              <select
                className="form-select"
                style={{ width: 'auto', fontSize: '13px', padding: '4px 8px' }}
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="BACKUP">BACKUP</option>
                <option value="RESTORE">RESTORE</option>
                <option value="RESET">RESET</option>
              </select>
            </div>
          </div>

          {auditLoading ? (
            <LoadingSkeleton type="table" rows={6} />
          ) : auditLogs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No audit entries"
              description="No administrative actions match your current filter."
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target Table</th>
                    <th>Record ID</th>
                    <th>Change Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.user_email || 'System'}</td>
                      <td>
                        <Badge variant={log.action === 'DELETE' ? 'rejected' : 'solid'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.target_table}</td>
                      <td style={{ color: '#525252' }}>{log.target_id || '—'}</td>
                      <td style={{ maxWidth: '380px', fontSize: '12px', color: '#525252' }}>
                        {log.change_summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Add / Edit Row Modal */}
      <Modal
        isOpen={isRowModalOpen}
        onClose={() => setIsRowModalOpen(false)}
        title={`${editingRow ? 'Edit' : 'Insert'} Row in '${selectedTable}'`}
        maxWidth={580}
      >
        {rowModalError && (
          <div style={{
            padding: '10px 14px',
            border: '1px solid #0A0A0A',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#FAFAFA',
            marginBottom: '16px',
            fontWeight: 500
          }}>
            {rowModalError}
          </div>
        )}

        <form onSubmit={handleSaveRow}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
            {tableData?.columns?.map(col => {
              // Primary keys are read-only on edit or auto-increment on create
              if (col.primary_key && !editingRow) return null;
              const isReadOnly = col.primary_key && Boolean(editingRow);

              return (
                <div key={col.name} className="form-group" style={{ gridColumn: col.name === 'description' || col.name === 'notes' || col.name === 'change_summary' ? 'span 2' : 'span 1' }}>
                  <label className="form-label">
                    {col.name} {col.nullable ? '' : '*'}
                    {col.foreign_key && <span style={{ textTransform: 'none', color: '#737373' }}> (FK: {col.foreign_key})</span>}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={rowFormData[col.name] !== undefined && rowFormData[col.name] !== null ? String(rowFormData[col.name]) : ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, [col.name]: e.target.value })}
                    disabled={isReadOnly}
                    placeholder={col.nullable ? 'Optional' : 'Required'}
                    required={!col.nullable && !col.primary_key}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRowModalOpen(false)}
              disabled={rowModalLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={rowModalLoading}
            >
              {rowModalLoading ? 'Saving...' : 'Save Row'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title={`Import Data into '${selectedTable}'`}
      >
        {importResult && (
          <div style={{
            padding: '12px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <div><strong>Inserted:</strong> {importResult.inserted_count} rows</div>
            <div><strong>Updated:</strong> {importResult.updated_count} rows</div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginTop: '8px', color: '#0A0A0A' }}>
                <strong>Errors ({importResult.errors.length}):</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '4px', fontSize: '12px' }}>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleImportSubmit}>
          <div className="form-group">
            <label className="form-label">Select CSV or JSON File</label>
            <input
              type="file"
              className="form-input"
              accept=".csv,.json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              required
            />
            <p className="form-hint">
              The file headers or keys must match column names of <strong>{selectedTable}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsImportOpen(false)}
              disabled={importLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={importLoading || !importFile}
            >
              {importLoading ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Row Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteRowId)}
        onClose={() => setDeleteRowId(null)}
        onConfirm={handleDeleteRow}
        title={`Delete Row ${deleteRowId}`}
        message={`Are you sure you want to delete row ID '${deleteRowId}' from table '${selectedTable}'? This will permanently remove the record.`}
        confirmLabel="Delete Row"
        isDanger={true}
        isLoading={deleteLoading}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset Entire Database"
        message="CAUTION: This will wipe all current tables and re-populate the database with the baseline realistic Indian sample data. Are you sure you want to proceed?"
        confirmLabel="Reset Everything"
        isDanger={true}
        isLoading={resetLoading}
      />
    </div>
  );
}

