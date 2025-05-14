// src/pages/ManageUsersPage.js
// Página para administrar usuarios individuales (listar, editar, eliminar, cambiar contraseña)

import React, { useState, useEffect, useCallback } from 'react';
import './ManageUsersPage.css'; // Asegúrate de que este archivo CSS esté en la misma carpeta

// Iconos simples (puedes usar una librería de iconos como react-icons si prefieres)
const EditIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;
const DeleteIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
const KeyIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.623 5.668M15 7A6 6 0 109 13m6-6A2 2 0 109 7m6 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m0 0a2 2 0 00-2 2m0 0A6 6 0 003 13m0 0a6 6 0 007.623 5.668m0 0A2 2 0 0113 17m0 0a2 2 0 002 2m0 0a2 2 0 012-2m0 0A2 2 0 0013 17m2 2v2m-2-2v-2"></path></svg>;

// Componente Modal Genérico (reutilizado)
const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h2>{title}</h2><button onClick={onClose} className="modal-close-button" aria-label="Cerrar modal">&times;</button></div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

function ManageUsersPage() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingAction, setIsProcessingAction] = useState(false); // Para acciones individuales como editar/eliminar
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({ nombres: '', apellidos: '', edad: '', correo: '', role: 'estudiante' });
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // Función para mostrar mensajes de feedback y limpiarlos después de un tiempo
    const showFeedback = (message, type = 'success', duration = 4000) => {
        if (type === 'success') { 
            setSuccessMessage(message); 
            setError(null); // Limpiar error si hay éxito
        } else { 
            setError(message); 
            setSuccessMessage(null); // Limpiar mensaje de éxito si hay error
        }
        setTimeout(() => { 
            setSuccessMessage(''); 
            setError(''); 
        }, duration);
    };

    // Cargar todos los usuarios
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        // No limpiar error aquí para que errores de acciones previas no desaparezcan inmediatamente
        try {
            const response = await fetch('/api/admin/users/all'); // Asumiendo proxy configurado
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errorData.error || `Error ${response.status}`);
            }
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error("Error al cargar usuarios:", err);
            showFeedback(`Error al cargar usuarios: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Manejadores para abrir modales
    const handleOpenEditModal = (user) => {
        setCurrentUserToEdit(user);
        setEditFormData({ 
            nombres: user.nombres || '', 
            apellidos: user.apellidos || '', 
            edad: user.edad === null || user.edad === undefined ? '' : user.edad, // Manejar edad nula
            correo: user.correo || '', 
            role: user.role || 'estudiante' 
        });
        setIsEditModalOpen(true);
        setError(null); setSuccessMessage(''); // Limpiar mensajes al abrir modal
    };

    const handleOpenPasswordModal = (user) => {
        setCurrentUserToEdit(user);
        setNewPassword('');
        setConfirmNewPassword('');
        setIsPasswordModalOpen(true);
        setError(null); setSuccessMessage('');
    };

    const handleOpenDeleteModal = (user) => {
        setCurrentUserToEdit(user);
        setIsDeleteModalOpen(true);
        setError(null); setSuccessMessage('');
    };

    // Manejador para cambios en el formulario de edición
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ 
            ...prev, 
            [name]: name === 'edad' ? (value === '' ? '' : parseInt(value, 10)) : value 
        }));
    };

    // Acción: Actualizar Usuario
    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!currentUserToEdit) return;
        setIsProcessingAction(true); // Indicar acción en curso
        try {
            const payload = { ...editFormData };
            // Convertir edad a número o enviar null si está vacío
            payload.edad = payload.edad === '' || isNaN(payload.edad) ? null : Number(payload.edad);

            const response = await fetch(`/api/admin/users/${currentUserToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' /* , 'Authorization': `Bearer ${token}` */ },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al actualizar usuario.');
            showFeedback('Usuario actualizado exitosamente.', 'success');
            fetchUsers(); // Recargar lista de usuarios
            setIsEditModalOpen(false); // Cerrar modal
        } catch (err) {
            showFeedback(err.message, 'error'); // Mostrar error dentro del modal o como global
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Acción: Cambiar Contraseña
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!currentUserToEdit) return;
        if (newPassword !== confirmNewPassword) {
            showFeedback('Las contraseñas nuevas no coinciden.', 'error');
            return;
        }
        if (newPassword.length < 6) { // Validación simple de longitud
            showFeedback('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }
        setIsProcessingAction(true);
        try {
            const response = await fetch(`/api/admin/users/${currentUserToEdit.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' /* , 'Authorization': `Bearer ${token}` */ },
                body: JSON.stringify({ new_password: newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cambiar la contraseña.');
            showFeedback('Contraseña actualizada exitosamente.', 'success');
            setIsPasswordModalOpen(false);
        } catch (err) {
            showFeedback(err.message, 'error');
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Acción: Eliminar Usuario
    const handleDeleteUser = async () => {
        if (!currentUserToEdit) return;
        setIsProcessingAction(true);
        try {
            const response = await fetch(`/api/admin/users/${currentUserToEdit.id}`, {
                method: 'DELETE',
                headers: { /* 'Authorization': `Bearer ${token}` */ }
            });
            const data = await response.json(); // Intentar parsear JSON siempre
            if (!response.ok) throw new Error(data.error || 'Error al eliminar usuario.');
            showFeedback('Usuario eliminado exitosamente.', 'success');
            fetchUsers(); // Recargar lista
            setIsDeleteModalOpen(false); // Cerrar modal
        } catch (err) {
            showFeedback(err.message, 'error');
        } finally {
            setIsProcessingAction(false);
        }
    };


    return (
        <div className="manage-users-container">
            <header className="page-header-admin">
                <h1>Gestión de Usuarios de la Plataforma</h1>
            </header>

            {/* Mensajes globales de feedback */}
            {error && <div className="error-message global-feedback" role="alert">{error}</div>}
            {successMessage && <div className="success-message global-feedback" role="alert">{successMessage}</div>}

            {isLoading && users.length === 0 && <p className="loading-text">Cargando usuarios...</p>}
            
            {!isLoading && users.length === 0 && !error && (
                <p className="empty-state-users">No hay usuarios registrados en la plataforma.</p>
            )}

            {users.length > 0 && (
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombres</th>
                                <th>Apellidos</th>
                                <th>Correo</th>
                                <th>Edad</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.nombres || '-'}</td>
                                    <td>{user.apellidos || '-'}</td>
                                    <td>{user.correo}</td>
                                    <td>{user.edad !== null ? user.edad : '-'}</td>
                                    <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                                    <td className="user-actions-cell">
                                        <button onClick={() => handleOpenEditModal(user)} className="action-btn edit-btn" title="Editar Usuario" disabled={isProcessingAction}><EditIcon /></button>
                                        <button onClick={() => handleOpenPasswordModal(user)} className="action-btn password-btn" title="Cambiar Contraseña" disabled={isProcessingAction}><KeyIcon /></button>
                                        <button onClick={() => handleOpenDeleteModal(user)} className="action-btn delete-btn" title="Eliminar Usuario" disabled={isProcessingAction}><DeleteIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal para Editar Usuario */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Editar Usuario: ${currentUserToEdit?.nombres || ''} ${currentUserToEdit?.apellidos || ''}`}>
                {currentUserToEdit && (
                    <form onSubmit={handleUpdateUser} className="modal-form">
                        <div className="form-field-modal">
                            <label htmlFor="editNombres">Nombres:</label>
                            <input type="text" id="editNombres" name="nombres" value={editFormData.nombres} onChange={handleEditFormChange} />
                        </div>
                        <div className="form-field-modal">
                            <label htmlFor="editApellidos">Apellidos:</label>
                            <input type="text" id="editApellidos" name="apellidos" value={editFormData.apellidos} onChange={handleEditFormChange} />
                        </div>
                        <div className="form-field-modal">
                            <label htmlFor="editEdad">Edad:</label>
                            <input type="number" id="editEdad" name="edad" value={editFormData.edad} onChange={handleEditFormChange} min="0" placeholder="Ej: 25"/>
                        </div>
                        <div className="form-field-modal">
                            <label htmlFor="editCorreo">Correo:</label>
                            <input type="email" id="editCorreo" name="correo" value={editFormData.correo} onChange={handleEditFormChange} required />
                        </div>
                        <div className="form-field-modal">
                            <label htmlFor="editRole">Rol:</label>
                            <select id="editRole" name="role" value={editFormData.role} onChange={handleEditFormChange}>
                                <option value="estudiante">Estudiante</option>
                                <option value="administrador">Administrador</option>
                            </select>
                        </div>
                        <div className="modal-form-actions">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="form-button secondary" disabled={isProcessingAction}>Cancelar</button>
                            <button type="submit" className="form-button primary" disabled={isProcessingAction}>{isProcessingAction ? 'Guardando...' : 'Guardar Cambios'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal para Cambiar Contraseña */}
            <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title={`Cambiar Contraseña para: ${currentUserToEdit?.correo || ''}`}>
                 {currentUserToEdit && (
                    <form onSubmit={handleChangePassword} className="modal-form">
                        <div className="form-field-modal">
                            <label htmlFor="newPassword">Nueva Contraseña:</label>
                            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Mínimo 6 caracteres"/>
                        </div>
                        <div className="form-field-modal">
                            <label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña:</label>
                            <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                        </div>
                        <div className="modal-form-actions">
                            <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="form-button secondary" disabled={isProcessingAction}>Cancelar</button>
                            <button type="submit" className="form-button primary" disabled={isProcessingAction}>{isProcessingAction ? 'Cambiando...' : 'Cambiar Contraseña'}</button>
                        </div>
                    </form>
                 )}
            </Modal>

            {/* Modal para Confirmar Eliminación de Usuario */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                {currentUserToEdit && (
                    <>
                        <p>¿Estás seguro de que quieres eliminar al usuario "<strong>{currentUserToEdit.nombres} {currentUserToEdit.apellidos} ({currentUserToEdit.correo})</strong>"?</p>
                        <p>Esta acción no se puede deshacer y eliminará todas sus evaluaciones y membresías a grupos asociadas.</p>
                        <div className="modal-form-actions">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="form-button secondary" disabled={isProcessingAction}>Cancelar</button>
                            <button onClick={handleDeleteUser} className="form-button danger" disabled={isProcessingAction}>{isProcessingAction ? 'Eliminando...' : 'Sí, Eliminar Usuario'}</button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}

export default ManageUsersPage;
