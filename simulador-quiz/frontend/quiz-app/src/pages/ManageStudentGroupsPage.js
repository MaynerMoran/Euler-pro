// ManageStudentGroupsPage.js
// Componente para administrar grupos de estudiantes, con correcciones y mejoras.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ManageStudentGroupsPage.css'; // Asegúrate de que este archivo CSS esté en la misma carpeta

// Iconos simples (puedes usar una librería como react-icons para más opciones)
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const GroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125A2.25 2.25 0 014.5 4.875h15A2.25 2.25 0 0121.75 7.125v4.575A2.25 2.25 0 0119.5 13.95h-15A2.25 2.25 0 012.25 11.7V7.125zM19.5 13.95v4.5A2.25 2.25 0 0117.25 20.7h-10.5A2.25 2.25 0 014.5 18.45v-4.5M19.5 13.95h.008v.008H19.5v-.008zm-.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon search-input-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c1.153 0 2.243.492 3.004 1.308m0 0c.76.816 1.85.998 3.003.998m0 0A48.093 48.093 0 0112 5.845m0 0a48.108 48.108 0 013.478-.397m1.5 0c.342.052.682.107 1.022.166m0 0V4.875c0-.621-.504-1.125-1.125-1.125H11.25c-.621 0-1.125.504-1.125 1.125v.916c0 .621.504 1.125 1.125 1.125h1.5A1.125 1.125 0 0114.74 9z" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// Componente Modal Genérico
const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (!isOpen) return; 
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]); 

    if (!isOpen) return null; 

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-button" aria-label="Cerrar modal">&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

function ManageStudentGroupsPage() {
    const [allStudents, setAllStudents] = useState([]);
    const [studentGroups, setStudentGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [error, setError] = useState(null); 
    const [successMessage, setSuccessMessage] = useState(''); 

    const [selectedStudents, setSelectedStudents] = useState([]);
    const [targetGroupForAssignment, setTargetGroupForAssignment] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [currentGroupForModal, setCurrentGroupForModal] = useState(null);
    const [currentGroupMembers, setCurrentGroupMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [modalError, setModalError] = useState(null); 

    const [showConfirmDeleteGroupModal, setShowConfirmDeleteGroupModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);

    const showFeedbackMessage = (message, type = 'success', duration = 4000, isModalMsg = false) => {
        if (isModalMsg) {
            if (type === 'success') { 
                setModalError(null); // Limpiar error si hay éxito en modal (aunque raro)
            } else {
                setModalError(message);
            }
        } else {
            if (type === 'success') {
                setSuccessMessage(message);
                setError(null);
            } else {
                setError(message);
                setSuccessMessage(null);
            }
            setTimeout(() => {
                setSuccessMessage('');
                setError('');
            }, duration);
        }
    };

    const fetchStudents = useCallback(async () => {
        setIsLoadingStudents(true);
        try {
            const response = await fetch('/api/admin/users?role=estudiante');
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const data = await response.json();
            setAllStudents(data);
        } catch (err) {
            console.error("Error fetching students:", err);
            showFeedbackMessage(`Error al cargar estudiantes: ${err.message}`, 'error');
        } finally {
            setIsLoadingStudents(false);
        }
    }, []);

    const fetchStudentGroups = useCallback(async () => {
        setIsLoadingGroups(true);
        try {
            const response = await fetch('/api/admin/student_groups');
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            const data = await response.json();
            setStudentGroups(data);
        } catch (err) {
            console.error("Error fetching student groups:", err);
            showFeedbackMessage(`Error al cargar grupos: ${err.message}`, 'error');
        } finally {
            setIsLoadingGroups(false);
        }
    }, []);

    useEffect(() => {
        fetchStudents();
        fetchStudentGroups();
    }, [fetchStudents, fetchStudentGroups]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return allStudents;
        const lower = searchTerm.toLowerCase();
        return allStudents.filter(s => 
            s.nombres?.toLowerCase().includes(lower) || 
            s.apellidos?.toLowerCase().includes(lower) || 
            s.correo?.toLowerCase().includes(lower)
        );
    }, [allStudents, searchTerm]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) {
            showFeedbackMessage("El nombre del grupo no puede estar vacío.", 'error');
            return;
        }
        setIsCreatingGroup(true);
        try {
            const response = await fetch('/api/admin/student_groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName, description: newGroupDescription }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Error al crear grupo.`);
            setNewGroupName(''); setNewGroupDescription('');
            showFeedbackMessage(`Grupo '${data.name}' creado.`, 'success');
            fetchStudentGroups(); 
        } catch (err) {
            showFeedbackMessage(err.message, 'error');
        } finally {
            setIsCreatingGroup(false);
        }
    };
    
    const handleStudentSelection = (studentId) => {
        setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
    };

    const handleAssignStudentsToGroup = async () => {
        if (!targetGroupForAssignment) { showFeedbackMessage("Selecciona un grupo de destino.", 'error'); return; }
        if (selectedStudents.length === 0) { showFeedbackMessage("Selecciona al menos un estudiante.", 'error'); return; }
        
        setIsProcessing(true);
        let successCount = 0; let errorCount = 0; let errorMsgs = [];
        for (const studentId of selectedStudents) {
            try {
                const response = await fetch(`/api/admin/student_groups/${targetGroupForAssignment}/members`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: studentId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `Error asignando ID ${studentId}`);
                successCount++;
            } catch (err) { errorCount++; errorMsgs.push(err.message); }
        }
        setIsProcessing(false);
        if (successCount > 0) showFeedbackMessage(`${successCount} estudiante(s) asignado(s). ${errorCount > 0 ? errorCount + ' errores.' : ''}`, 'success');
        if (errorCount > 0 && successCount === 0) showFeedbackMessage(`No se pudieron asignar: ${errorMsgs.join('; ')}`, 'error');
        else if (errorCount > 0) showFeedbackMessage(`Errores al asignar: ${errorMsgs.join('; ')}`, 'error', 5000);
        setSelectedStudents([]); fetchStudentGroups();
    };

    const handleViewMembers = async (group) => {
        setCurrentGroupForModal(group);
        setIsMembersModalOpen(true);
        setIsLoadingMembers(true); 
        setModalError(null); 
        try {
            // Asegurarse de que el método es GET y las cabeceras son apropiadas
            const response = await fetch(`/api/admin/student_groups/${group.id}/members`, {
                method: 'GET', // Especificar GET explícitamente
                headers: {
                    'Accept': 'application/json',
                    // Si tus endpoints de admin requieren autenticación, añade el token aquí
                    // 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
                }
            });
            if (!response.ok) {
                let errorDetail = `Error HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.error || errorDetail;
                } catch (e) {
                    // No hacer nada si el cuerpo del error no es JSON
                }
                throw new Error(errorDetail);
            }
            const data = await response.json();
            setCurrentGroupMembers(data);
        } catch (err) {
            console.error("Error en handleViewMembers:", err);
            showFeedbackMessage(err.message, 'error', 5000, true); 
            setCurrentGroupMembers([]);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleRemoveStudentFromGroup = async (groupId, userId, studentName) => {
        if (!window.confirm(`¿Quitar a ${studentName} del grupo "${currentGroupForModal?.name}"?`)) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/student_groups/${groupId}/members/${userId}`, { 
                method: 'DELETE',
                headers: { /* 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` */ }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al quitar estudiante.');
            showFeedbackMessage(data.message || 'Estudiante quitado.', 'success');
            if (currentGroupForModal && currentGroupForModal.id === groupId) {
                setCurrentGroupMembers(prev => prev.filter(member => member.id !== userId));
            }
            fetchStudentGroups();
        } catch (err) {
            showFeedbackMessage(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const openDeleteGroupModal = (group) => {
        setGroupToDelete(group);
        setShowConfirmDeleteGroupModal(true);
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/student_groups/${groupToDelete.id}`, { 
                method: 'DELETE',
                headers: { /* 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` */ }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al eliminar grupo.');
            showFeedbackMessage(data.message || `Grupo "${groupToDelete.name}" eliminado.`, 'success');
            fetchStudentGroups();
        } catch (err) {
            showFeedbackMessage(err.message, 'error');
        } finally {
            setIsProcessing(false);
            setShowConfirmDeleteGroupModal(false);
            setGroupToDelete(null);
        }
    };
    
    return (
        <div className="manage-groups-container">
            <header className="groups-header">
                <h1><GroupIcon /> Administración de Grupos de Estudiantes</h1>
            </header>

            {error && !isMembersModalOpen && !showConfirmDeleteGroupModal && <div className="error-message global-feedback" role="alert">{error}</div>}
            {successMessage && !isMembersModalOpen && !showConfirmDeleteGroupModal && <div className="success-message global-feedback" role="alert">{successMessage}</div>}

            <div className="panels-container">
                <section className="panel students-panel">
                    <h2 className="panel-title"><UsersIcon /> Estudiantes Disponibles ({filteredStudents.length} de {allStudents.length})</h2>
                    <div className="search-bar-container">
                        <SearchIcon />
                        <input type="text" placeholder="Buscar estudiantes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="students-search-input"/>
                    </div>
                    {isLoadingStudents ? <p className="loading-text">Cargando estudiantes...</p> : (
                        filteredStudents.length === 0 && searchTerm.trim() !== '' ? <p className="empty-state">No se encontraron: "{searchTerm}".</p> :
                        filteredStudents.length === 0 && allStudents.length === 0 ? <p className="empty-state">No hay estudiantes.</p> : (
                            <ul className="entity-list student-list">
                                {filteredStudents.map(student => (
                                    <li key={student.id} className={`student-item ${selectedStudents.includes(student.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" id={`student-${student.id}`} checked={selectedStudents.includes(student.id)} onChange={() => handleStudentSelection(student.id)} className="student-checkbox"/>
                                        <label htmlFor={`student-${student.id}`} className="student-info">
                                            <span className="student-name">{student.nombres} {student.apellidos}</span>
                                            <span className="student-email">{student.correo}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )
                    )}
                </section>

                <section className="panel actions-panel">
                    <h2 className="panel-title"><PlusIcon /> Crear Nuevo Grupo</h2>
                    <form onSubmit={handleCreateGroup} className="create-group-form">
                        <div className="form-field">
                            <label htmlFor="groupName">Nombre del Grupo:</label>
                            <input type="text" id="groupName" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ej: Cálculo Avanzado G1" required />
                        </div>
                        <div className="form-field">
                            <label htmlFor="groupDescription">Descripción (Opcional):</label>
                            <textarea id="groupDescription" value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)} placeholder="Ej: Grupo para el curso intensivo" rows="3" />
                        </div>
                        <button type="submit" className="action-button create-button" disabled={isCreatingGroup || isProcessing}>
                            {isCreatingGroup ? 'Creando...' : 'Crear Grupo'}
                        </button>
                    </form>
                    <hr className="divider" />
                    <h2 className="panel-title assign-title">Asignar Estudiantes a Grupo</h2>
                    <div className="assign-controls">
                         <div className="form-field">
                            <label htmlFor="targetGroup">Grupo de Destino:</label>
                            <select id="targetGroup" value={targetGroupForAssignment} onChange={(e) => setTargetGroupForAssignment(e.target.value)} disabled={studentGroups.length === 0 || isProcessing}>
                                <option value="">-- Selecciona un grupo --</option>
                                {studentGroups.map(group => (<option key={group.id} value={group.id}>{group.name}</option>))}
                            </select>
                        </div>
                        <button onClick={handleAssignStudentsToGroup} className="action-button assign-button"
                            disabled={selectedStudents.length === 0 || !targetGroupForAssignment || isLoadingStudents || isLoadingGroups || isProcessing}>
                            Asignar Seleccionados
                        </button>
                    </div>
                     {selectedStudents.length > 0 && (<p className="selection-info">{selectedStudents.length} estudiante(s) seleccionado(s).</p>)}
                </section>

                <section className="panel groups-panel">
                    <h2 className="panel-title"><GroupIcon /> Grupos Existentes ({studentGroups.length})</h2>
                    {isLoadingGroups ? <p className="loading-text">Cargando grupos...</p> : (
                         studentGroups.length === 0 ? <p className="empty-state">No hay grupos creados.</p> : (
                            <ul className="entity-list group-list">
                                {studentGroups.map(group => (
                                    <li key={group.id} className="group-item">
                                        <div className="group-info">
                                            <span className="group-name">{group.name}</span>
                                            <span className="group-description">{group.description || 'Sin descripción'}</span>
                                            <span className="group-members">Miembros: {group.member_count ?? 'N/A'}</span>
                                        </div>
                                        <div className="group-actions">
                                            <button onClick={() => handleViewMembers(group)} className="action-button-sm view-button" title="Ver Miembros" disabled={isProcessing}>
                                                <EyeIcon /> Ver
                                            </button>
                                            <button onClick={() => openDeleteGroupModal(group)} className="action-button-sm delete-button" title="Eliminar Grupo" disabled={isProcessing}>
                                                <TrashIcon /> Eliminar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                         )
                    )}
                </section>
            </div>

            <Modal 
                isOpen={isMembersModalOpen} 
                onClose={() => { setIsMembersModalOpen(false); setModalError(null); }}
                title={`Miembros de: ${currentGroupForModal?.name || ''}`}
            >
                {modalError && <p className="error-message modal-error">{modalError}</p>}
                {isLoadingMembers && <p className="loading-text">Cargando miembros...</p>}
                {!isLoadingMembers && !modalError && currentGroupMembers.length === 0 && (
                    <p className="empty-state">Este grupo no tiene miembros asignados.</p> 
                )}
                {!isLoadingMembers && !modalError && currentGroupMembers.length > 0 && (
                    <ul className="entity-list members-in-modal-list">
                        {currentGroupMembers.map(member => (
                            <li key={member.id} className="member-item">
                                <span>{member.nombres} {member.apellidos} ({member.correo})</span>
                                <button 
                                    onClick={() => handleRemoveStudentFromGroup(currentGroupForModal.id, member.id, `${member.nombres} ${member.apellidos}`)}
                                    className="action-button-sm remove-member-button"
                                    disabled={isProcessing}
                                    title="Quitar del grupo"
                                >
                                    <XCircleIcon/> Quitar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal>
            
            <Modal 
                isOpen={showConfirmDeleteGroupModal} 
                onClose={() => setShowConfirmDeleteGroupModal(false)}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar el grupo "<strong>{groupToDelete?.name}</strong>"?</p>
                <p>Esta acción no se puede deshacer y los estudiantes serán desvinculados del grupo (pero no eliminados de la plataforma).</p>
                <div className="modal-actions">
                    <button onClick={() => setShowConfirmDeleteGroupModal(false)} className="action-button secondary-button" disabled={isProcessing}>
                        Cancelar
                    </button>
                    <button onClick={handleDeleteGroup} className="action-button delete-button" disabled={isProcessing}>
                        {isProcessing ? 'Eliminando...' : 'Sí, Eliminar'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}

export default ManageStudentGroupsPage;
