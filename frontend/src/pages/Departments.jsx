import React, { useEffect, useState } from 'react';
import { departmentsApi } from '../api/departments';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Building2, Plus, Edit2, Trash2, ChevronRight, Briefcase } from 'lucide-react';

export function Departments({ user }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Department Modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', is_active: true });
  const [deptLoading, setDeptLoading] = useState(false);

  // Designation Modal
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [targetDeptId, setTargetDeptId] = useState(null);
  const [desigForm, setDesigForm] = useState({ title: '', description: '', is_active: true });
  const [desigLoading, setDesigLoading] = useState(false);

  // Delete Confirm
  const [deleteItem, setDeleteItem] = useState(null); // { type: 'dept'|'desig', id, name }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await departmentsApi.list();
      setDepartments(data);
    } catch (err) {
      setError(err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeptModal = (dept = null) => {
    setEditingDept(dept);
    if (dept) {
      setDeptForm({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        is_active: dept.is_active,
      });
    } else {
      setDeptForm({ name: '', code: '', description: '', is_active: true });
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    setDeptLoading(true);
    try {
      if (editingDept) {
        await departmentsApi.updateDepartment(editingDept.id, deptForm);
      } else {
        await departmentsApi.createDepartment(deptForm);
      }
      setIsDeptModalOpen(false);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to save department.');
    } finally {
      setDeptLoading(false);
    }
  };

  const handleOpenDesigModal = (deptId, desig = null) => {
    setTargetDeptId(deptId);
    setEditingDesig(desig);
    if (desig) {
      setDesigForm({
        title: desig.title,
        description: desig.description || '',
        is_active: desig.is_active,
      });
    } else {
      setDesigForm({ title: '', description: '', is_active: true });
    }
    setIsDesigModalOpen(true);
  };

  const handleSaveDesig = async (e) => {
    e.preventDefault();
    setDesigLoading(true);
    try {
      if (editingDesig) {
        await departmentsApi.updateDesignation(editingDesig.id, desigForm);
      } else {
        await departmentsApi.createDesignation(targetDeptId, desigForm);
      }
      setIsDesigModalOpen(false);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to save designation.');
    } finally {
      setDesigLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    try {
      if (deleteItem.type === 'dept') {
        await departmentsApi.deleteDepartment(deleteItem.id);
      } else {
        await departmentsApi.deleteDesignation(deleteItem.id);
      }
      setDeleteItem(null);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Failed to delete.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Action Header */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0A0A0A' }}>
              Departments & Designations
            </h2>
            <p className="muted" style={{ marginTop: '2px' }}>
              Organizational hierarchy and role designations
            </p>
          </div>
          {isAdmin && (
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenDeptModal(null)}
            >
              <Plus size={14} />
              <span>Add Department</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="table" rows={4} />
      ) : error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#0A0A0A' }}>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={loadDepartments}>
            Retry
          </button>
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments created"
          description="Create your first department to start organizing teams."
          actionLabel={isAdmin ? "Add Department" : undefined}
          onAction={isAdmin ? () => handleOpenDeptModal(null) : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {departments.map((dept) => (
            <div key={dept.id} className="card" style={{ padding: '20px' }}>
              {/* Department Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E5E5E5'
                  }}>
                    <Building2 size={20} color="#0A0A0A" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0A0A0A' }}>
                        {dept.name}
                      </h3>
                      <Badge variant="outline">{dept.code}</Badge>
                      <span style={{ fontSize: '12px', color: '#737373', fontWeight: 500 }}>
                        {dept.employee_count} {dept.employee_count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    {dept.description && (
                      <p style={{ fontSize: '12px', color: '#525252', marginTop: '2px' }}>
                        {dept.description}
                      </p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenDesigModal(dept.id, null)}
                    >
                      <Plus size={13} />
                      <span>Add Designation</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenDeptModal(dept)}
                      title="Edit Department"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDeleteItem({ type: 'dept', id: dept.id, name: dept.name })}
                      title="Delete Department"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Designations List */}
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  Designations ({dept.designations.length})
                </div>

                {dept.designations.length === 0 ? (
                  <p className="muted" style={{ fontSize: '12px' }}>No designations added to this department yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                    {dept.designations.map((desig) => (
                      <div 
                        key={desig.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          border: '1px solid #E5E5E5',
                          borderRadius: '6px',
                          backgroundColor: '#FAFAFA'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Briefcase size={14} color="#737373" />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0A' }}>
                            {desig.title}
                          </span>
                        </div>

                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 6px' }}
                              onClick={() => handleOpenDesigModal(dept.id, desig)}
                              title="Edit"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 6px' }}
                              onClick={() => setDeleteItem({ type: 'desig', id: desig.id, name: desig.title })}
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? "Edit Department" : "Add Department"}
      >
        <form onSubmit={handleSaveDept}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Quality Assurance"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              className="form-input"
              required
              maxLength={10}
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. QA"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Scope of responsibilities and team role..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDeptModalOpen(false)}
              disabled={deptLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={deptLoading}
            >
              {deptLoading ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Designation Modal */}
      <Modal
        isOpen={isDesigModalOpen}
        onClose={() => setIsDesigModalOpen(false)}
        title={editingDesig ? "Edit Designation" : "Add Designation"}
      >
        <form onSubmit={handleSaveDesig}>
          <div className="form-group">
            <label className="form-label">Designation Title *</label>
            <input
              type="text"
              className="form-input"
              required
              value={desigForm.title}
              onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
              placeholder="e.g. Senior QA Engineer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={desigForm.description}
              onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
              placeholder="Optional summary of job role"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsDesigModalOpen(false)}
              disabled={desigLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={desigLoading}
            >
              {desigLoading ? 'Saving...' : 'Save Designation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteItem?.type === 'dept' ? 'Department' : 'Designation'}`}
        message={`Are you sure you want to delete '${deleteItem?.name}'? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger={true}
        isLoading={deleteLoading}
      />
    </div>
  );
}

