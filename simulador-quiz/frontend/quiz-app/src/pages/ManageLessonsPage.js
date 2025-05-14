// src/pages/ManageLessonsPage.js
// Página para crear, configurar y administrar lecciones/evaluaciones con formulario integrado.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ManageLessonsPage.css'; // Asegúrate de tener este archivo CSS

// Iconos (reutiliza los que ya tienes definidos en otros archivos o defínelos aquí)
const LessonIcon = () => <svg className="icon-header" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m0 0a8.485 8.485 0 0011.925 0M12 17.747a8.485 8.485 0 01-11.925 0M12 6.253a8.485 8.485 0 010-5.494m0 5.494a8.485 8.485 0 000 5.494m0-5.494L5.025 3.732m6.95 2.521L18.975 3.732M5.025 3.732L3.06 6.68m15.88-2.948L20.94 6.68M3.06 6.68L12 17.747l8.94-11.067M3.06 6.68l8.94 2.564M20.94 6.68l-8.94 2.564"></path></svg>;
const PlusIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const EditIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;
const TrashIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
const AddCircleIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const SearchIcon = () => <svg className="icon-sm search-filter-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>;

// Modal solo para confirmaciones
const ConfirmationModal = ({ isOpen, onClose, title, message, onConfirm, isProcessing }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h2>{title}</h2><button onClick={onClose} className="modal-close-button" aria-label="Cerrar">&times;</button></div>
                <div className="modal-body"><p>{message}</p></div>
                <div className="modal-form-actions">
                    <button onClick={onClose} className="form-button secondary" disabled={isProcessing}>Cancelar</button>
                    <button onClick={onConfirm} className="form-button danger" disabled={isProcessing}>{isProcessing ? 'Procesando...' : 'Confirmar'}</button>
                </div>
            </div>
        </div>
    );
};

const initialLessonState = {
    id: null,
    name: '',
    description: '',
    configurations: [{ tempId: Date.now(), question_group_id: '', num_questions_to_select: 1, time_per_question_seconds: 0 }],
    assigned_student_group_ids: []
};

function ManageLessonsPage() {
    const [lessons, setLessons] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [currentLessonFormData, setCurrentLessonFormData] = useState({ ...initialLessonState });
    const [isEditing, setIsEditing] = useState(false);

    const [allQuestionGroups, setAllQuestionGroups] = useState([]);
    const [allStudentGroups, setAllStudentGroups] = useState([]);

    const [qGroupSearchTerm, setQGroupSearchTerm] = useState('');
    const [sGroupSearchTerm, setSGroupSearchTerm] = useState('');

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [lessonToDelete, setLessonToDelete] = useState(null);

    const showFeedback = (message, type = 'success', duration = 4000) => {
        if (type === 'success') { setSuccessMessage(message); setError(null); }
        else { setError(message); setSuccessMessage(null); }
        setTimeout(() => { setSuccessMessage(''); setError(''); }, duration);
    };

    const fetchAllInitialData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const lessonsPromise = fetch('/api/admin/lessons').then(async res => {
                if (!res.ok) {
                    let errorMsg = `Error ${res.status} cargando lecciones`;
                    try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* Mantener errorMsg original */ }
                    return Promise.reject(errorMsg);
                }
                return res.json();
            });
            const qGroupsPromise = fetch('/api/admin/question_groups').then(async res => {
                if (!res.ok) {
                    let errorMsg = `Error ${res.status} cargando grupos de preguntas`;
                    try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* Mantener errorMsg original */ }
                    return Promise.reject(errorMsg);
                }
                return res.json();
            });
            const sGroupsPromise = fetch('/api/admin/student_groups').then(async res => {
                if (!res.ok) {
                    let errorMsg = `Error ${res.status} cargando grupos de estudiantes`;
                    try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* Mantener errorMsg original */ }
                    return Promise.reject(errorMsg);
                }
                return res.json();
            });

            const [lessonsData, qGroupsData, sGroupsData] = await Promise.all([lessonsPromise, qGroupsPromise, sGroupsPromise]);
            
            setLessons(lessonsData || []);
            setAllQuestionGroups(qGroupsData || []);
            setAllStudentGroups(sGroupsData || []);

        } catch (err) {
            console.error("Error cargando datos iniciales:", err);
            showFeedback(`Error al cargar datos: ${typeof err === 'string' ? err : (err.message || 'Error desconocido')}`, 'error');
            setLessons([]); setAllQuestionGroups([]); setAllStudentGroups([]);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        fetchAllInitialData();
    }, [fetchAllInitialData]);

    const handleLessonFormChange = (e) => {
        const { name, value } = e.target;
        setCurrentLessonFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleConfigChange = (index, field, value) => {
        setCurrentLessonFormData(prev => {
            const updatedConfigs = prev.configurations.map((conf, i) => 
                i === index ? { ...conf, [field]: value } : conf
            );
    
            if (field === 'num_questions_to_select' || field === 'question_group_id') {
                const currentConfig = { ...updatedConfigs[index] }; 
                const selectedGroupId = currentConfig.question_group_id;
                const group = allQuestionGroups.find(g => g.id.toString() === selectedGroupId.toString());
    
                let numQuestionsValue = parseInt(currentConfig.num_questions_to_select, 10);
                if (isNaN(numQuestionsValue)) numQuestionsValue = 0; 
    
                if (group && typeof group.question_count === 'number') {
                    const maxAllowed = group.question_count;
                    if (maxAllowed === 0) {
                        if (numQuestionsValue !== 0) {
                            // No mostrar feedback si el usuario no ha interactuado directamente con num_questions_to_select aún
                            // o si el valor ya es 0.
                            // showFeedback(`El grupo "${group.name}" no tiene preguntas. Se estableció N° de Preguntas en 0.`, 'warning', 5000);
                        }
                        currentConfig.num_questions_to_select = 0;
                    } else {
                        if (numQuestionsValue < 1 && value !== "" && value !== "0") { 
                            currentConfig.num_questions_to_select = 1; 
                        } else if (numQuestionsValue > maxAllowed) {
                            currentConfig.num_questions_to_select = maxAllowed;
                            showFeedback(`Máximo ${maxAllowed} preguntas para "${group.name}". Se ajustó el valor.`, 'info', 5000);
                        } else {
                             currentConfig.num_questions_to_select = Math.max(0, numQuestionsValue); 
                        }
                    }
                } else if (selectedGroupId) { 
                    currentConfig.num_questions_to_select = Math.max(1, numQuestionsValue);
                } else { 
                    currentConfig.num_questions_to_select = 1; 
                }
                updatedConfigs[index] = currentConfig; 
            } else if (field === 'time_per_question_seconds') {
                const timeValue = parseInt(value, 10);
                updatedConfigs[index][field] = isNaN(timeValue) || timeValue < 0 ? 0 : timeValue;
            }
    
            return { ...prev, configurations: updatedConfigs };
        });
    };
    

    const addConfigRow = () => {
        setCurrentLessonFormData(prev => ({
            ...prev,
            configurations: [...(prev.configurations || []), { tempId: Date.now(), question_group_id: '', num_questions_to_select: 1, time_per_question_seconds: 0 }]
        }));
    };

    const removeConfigRow = (index) => {
        if (currentLessonFormData.configurations.length <= 1) {
            showFeedback("Debe haber al menos una configuración de grupo de preguntas.", "error");
            return;
        }
        setCurrentLessonFormData(prev => ({
            ...prev,
            configurations: prev.configurations.filter((_, i) => i !== index)
        }));
    };

    const handleStudentGroupSelection = (groupId) => {
        setCurrentLessonFormData(prev => {
            const currentAssigned = prev.assigned_student_group_ids || [];
            const newAssignedIds = currentAssigned.includes(groupId)
                ? currentAssigned.filter(id => id !== groupId)
                : [...currentAssigned, groupId];
            return { ...prev, assigned_student_group_ids: newAssignedIds };
        });
    };

    const totalQuestionsInLesson = useMemo(() => {
        return (currentLessonFormData.configurations || []).reduce((sum, config) => {
            const numQuestions = Number(config.num_questions_to_select) || 0;
            return sum + numQuestions;
        }, 0);
    }, [currentLessonFormData.configurations]);

    const handleSetCreateMode = () => {
        setCurrentLessonFormData({ ...initialLessonState, configurations: [{ tempId: Date.now(), question_group_id: '', num_questions_to_select: 1, time_per_question_seconds: 0 }] });
        setIsEditing(false); setError(null); setSuccessMessage('');
        setQGroupSearchTerm(''); setSGroupSearchTerm('');
    };

    const handleOpenEditForm = (lesson) => {
        const configurations = lesson.configurations && lesson.configurations.length > 0 ? lesson.configurations.map((c, index) => ({
            tempId: c.id || Date.now() + index,
            question_group_id: c.question_group_id ? c.question_group_id.toString() : '',
            num_questions_to_select: c.num_questions_to_select || 1,
            time_per_question_seconds: c.time_per_question_seconds || 0
        })) : [{ tempId: Date.now(), question_group_id: '', num_questions_to_select: 1, time_per_question_seconds: 0 }];

        const assigned_student_group_ids = lesson.assigned_student_group_ids ? lesson.assigned_student_group_ids.map(id => id.toString()) : [];

        setCurrentLessonFormData({
            id: lesson.id, name: lesson.name || '', description: lesson.description || '',
            configurations: configurations, assigned_student_group_ids: assigned_student_group_ids
        });
        setIsEditing(true); setError(null); setSuccessMessage('');
        setQGroupSearchTerm(''); setSGroupSearchTerm('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveLesson = async (e) => {
        e.preventDefault();
        if (!currentLessonFormData.name.trim()) { showFeedback('El nombre de la lección es obligatorio.', 'error'); return; }

        for (const config of currentLessonFormData.configurations) {
            const group = allQuestionGroups.find(g => g.id.toString() === config.question_group_id.toString());
            const numSelected = Number(config.num_questions_to_select) || 0;

            if (!config.question_group_id) {
                showFeedback('Todas las configuraciones deben tener un grupo de preguntas seleccionado.', 'error', 6000); return;
            }
            if (group && typeof group.question_count === 'number') {
                if (group.question_count === 0 && numSelected > 0) {
                    showFeedback(`El grupo "${group.name}" no tiene preguntas. No se pueden seleccionar ${numSelected}.`, 'error', 7000); return;
                }
                if (numSelected <= 0 && group.question_count > 0) { 
                     showFeedback(`Debe seleccionar al menos 1 pregunta para el grupo "${group.name}" ya que tiene preguntas disponibles.`, 'error', 7000); return;
                }
                if (numSelected > group.question_count) {
                    showFeedback(`El N° de preguntas para "${group.name}" (${numSelected}) excede el máximo de ${group.question_count}. Ajuste por favor.`, 'error', 7000); return;
                }
            } else if (numSelected <=0 && config.question_group_id && (!group || typeof group.question_count !== 'number')) { 
                 showFeedback(`Debe seleccionar un número válido de preguntas (mayor a 0) para el grupo seleccionado, o el conteo del grupo no está disponible.`, 'error', 7000); return;
            }
        }

        setIsProcessingAction(true);
        const { id, ...dataToSubmit } = currentLessonFormData;
        const payloadConfigurations = dataToSubmit.configurations.map(c => {
            const { tempId, ...restOfConfig } = c; 
            return {
                ...restOfConfig, 
                question_group_id: parseInt(c.question_group_id, 10),
                num_questions_to_select: parseInt(c.num_questions_to_select, 10),
                time_per_question_seconds: parseInt(c.time_per_question_seconds, 10) || 0
            };
        });

        const payload = {
            name: dataToSubmit.name, description: dataToSubmit.description,
            configurations: payloadConfigurations,
            assigned_student_group_ids: (dataToSubmit.assigned_student_group_ids || []).map(sgId => parseInt(sgId, 10))
        };

        const url = isEditing && id ? `/api/admin/lessons/${id}` : '/api/admin/lessons';
        const method = isEditing && id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || `Error al guardar lección.`);
            showFeedback(responseData.message || `Lección ${isEditing ? 'actualizada' : 'creada'}.`, 'success');
            fetchAllInitialData(); 
            if (!isEditing) { 
                setCurrentLessonFormData({ ...initialLessonState, configurations: [{ tempId: Date.now(), question_group_id: '', num_questions_to_select: 1, time_per_question_seconds: 0 }] });
            } else { 
                handleSetCreateMode();
            }
        } catch (err) {
            showFeedback(err.message, 'error');
        } finally {
            setIsProcessingAction(false);
        }
    };

    const openDeleteLessonModal = (lesson) => { setLessonToDelete(lesson); };
    const confirmDeleteLesson = async () => {
        if (!lessonToDelete) return;
        setIsProcessingAction(true);
        try {
            const response = await fetch(`/api/admin/lessons/${lessonToDelete.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al eliminar lección.');
            showFeedback(data.message || 'Lección eliminada.', 'success');
            fetchAllInitialData();
            if (currentLessonFormData.id === lessonToDelete.id) { handleSetCreateMode(); }
        } catch (err) { showFeedback(err.message, 'error'); }
        finally { setIsProcessingAction(false); setLessonToDelete(null); }
    };

    const filteredQuestionGroups = useMemo(() => {
        if (!qGroupSearchTerm.trim()) return allQuestionGroups;
        return allQuestionGroups.filter(qg => qg.name.toLowerCase().includes(qGroupSearchTerm.toLowerCase()));
    }, [allQuestionGroups, qGroupSearchTerm]);

    const filteredStudentGroups = useMemo(() => {
        if (!sGroupSearchTerm.trim()) return allStudentGroups;
        return allStudentGroups.filter(sg => sg.name.toLowerCase().includes(sGroupSearchTerm.toLowerCase()));
    }, [allStudentGroups, sGroupSearchTerm]);

    return (
        <div className="manage-lessons-page">
            <header className="lessons-page-header">
                <h1><LessonIcon /> Diseño y Administración de Lecciones</h1>
            </header>

            {error && <div className="error-message global-feedback" role="alert">{error}</div>}
            {successMessage && <div className="success-message global-feedback" role="alert">{successMessage}</div>}

            <div className="lessons-layout">
                <section className="lesson-form-wrapper">
                    <div className="form-header">
                        <h2>
                            {isEditing 
                                ? <><EditIcon /> {`Editando: ${currentLessonFormData.name || 'Lección'}`}</>
                                : <><PlusIcon /> Crear Nueva Lección</>
                            }
                        </h2>
                        {isEditing && (
                            <button onClick={handleSetCreateMode} className="action-button secondary-action clear-form-btn">
                                <PlusIcon /> Pasar a Crear Nueva
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleSaveLesson} className="lesson-form-integrated">
                        <div className="form-section">
                            <h3>Información General</h3>
                            <div className="form-field">
                                <label htmlFor="lessonName">Nombre de la Lección:</label>
                                <input type="text" id="lessonName" name="name" value={currentLessonFormData.name} onChange={handleLessonFormChange} required />
                            </div>
                            <div className="form-field">
                                <label htmlFor="lessonDescription">Descripción (Opcional):</label>
                                <textarea id="lessonDescription" name="description" value={currentLessonFormData.description} onChange={handleLessonFormChange} rows="3" />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Configuración de Preguntas (Total en Lección: {totalQuestionsInLesson})</h3>
                            <div className="search-filter-group">
                                <label htmlFor="qGroupSearch">Buscar Grupo de Preguntas:</label>
                                <div className="search-input-wrapper">
                                    <SearchIcon />
                                    <input type="text" id="qGroupSearch" placeholder="Filtrar grupos de preguntas..." value={qGroupSearchTerm} onChange={(e) => setQGroupSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            {(currentLessonFormData.configurations || []).map((config, index) => {
                                const selectedGroup = allQuestionGroups.find(g => g.id.toString() === config.question_group_id.toString());
                                // const maxQuestions = selectedGroup ? selectedGroup.question_count : undefined; // Ya no se usa para mostrar
                                const isNumQuestionsDisabled = !config.question_group_id || (selectedGroup && typeof selectedGroup.question_count === 'number' && selectedGroup.question_count === 0);

                                return (
                                    <div key={config.tempId || `config-${index}`} className="config-row-integrated">
                                        <div className="config-field field-group-select">
                                            <label htmlFor={`config-qg-${index}`}>Grupo de Preguntas:</label>
                                            <select
                                                id={`config-qg-${index}`}
                                                name="question_group_id"
                                                value={config.question_group_id}
                                                onChange={(e) => handleConfigChange(index, 'question_group_id', e.target.value)}
                                                required
                                            >
                                                <option value="">-- Seleccionar Grupo --</option>
                                                {filteredQuestionGroups.map(qg => <option key={qg.id} value={qg.id}>{qg.name}{typeof qg.question_count === 'number' ? ` (${qg.question_count} pregs.)` : ''}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div className="config-field field-num-questions">
                                            <label htmlFor={`config-numq-${index}`}>N° Pregs. a Usar:</label>
                                            <input
                                                type="number"
                                                id={`config-numq-${index}`}
                                                name="num_questions_to_select"
                                                value={config.num_questions_to_select}
                                                onChange={(e) => handleConfigChange(index, 'num_questions_to_select', e.target.value)}
                                                min={isNumQuestionsDisabled ? 0 : 1}
                                                required
                                                disabled={isNumQuestionsDisabled}
                                                className={isNumQuestionsDisabled ? 'disabled-input' : ''}
                                            />
                                            {/* El texto "Disponible" y "Conteo no disponible" ha sido eliminado del JSX */}
                                        </div>

                                        <div className="config-field field-time">
                                            <label htmlFor={`config-timeq-${index}`}>Tiempo/Preg (s):</label>
                                            <input
                                                type="number"
                                                id={`config-timeq-${index}`}
                                                name="time_per_question_seconds"
                                                value={config.time_per_question_seconds}
                                                onChange={(e) => handleConfigChange(index, 'time_per_question_seconds', e.target.value)}
                                                min="0"
                                                title="0 = ilimitado"
                                            />
                                        </div>
                                        <div className="config-field action-field">
                                            {currentLessonFormData.configurations.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeConfigRow(index)}
                                                    className="remove-config-btn-integrated"
                                                    title="Quitar Configuración"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={addConfigRow} className="add-config-btn-integrated">
                                <AddCircleIcon /> Añadir Configuración de Grupo
                            </button>
                        </div>

                        <div className="form-section">
                            <h3>Asignar a Grupos de Estudiantes</h3>
                            <div className="search-filter-group">
                                <label htmlFor="sGroupSearch">Buscar Grupo de Estudiantes:</label>
                                <div className="search-input-wrapper">
                                    <SearchIcon />
                                    <input type="text" id="sGroupSearch" placeholder="Filtrar grupos de estudiantes..." value={sGroupSearchTerm} onChange={(e) => setSGroupSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            {isLoadingData && allStudentGroups.length === 0 ? <p className="loading-text">Cargando grupos...</p>: (
                                allStudentGroups.length === 0 ? <p className="empty-state-small">No hay grupos de estudiantes creados.</p> : (
                                    <div className="student-group-checkbox-list-integrated">
                                        {filteredStudentGroups.map(sg => (
                                            <label key={sg.id} className="checkbox-label-integrated">
                                                <input type="checkbox" value={sg.id.toString()} checked={(currentLessonFormData.assigned_student_group_ids || []).includes(sg.id.toString())} onChange={() => handleStudentGroupSelection(sg.id.toString())} />
                                                {sg.name}
                                            </label>
                                        ))}
                                        {filteredStudentGroups.length === 0 && sGroupSearchTerm && <p className="empty-state-small">No se encontraron grupos.</p>}
                                    </div>
                                )
                            )}
                        </div>

                        <div className="form-actions-integrated">
                            <button type="submit" className="form-button primary" disabled={isProcessingAction || isLoadingData}>
                                {isProcessingAction ? 'Guardando...' : (isEditing ? 'Actualizar Lección' : 'Crear Lección')}
                            </button>
                            <button type="button" onClick={handleSetCreateMode} className="form-button secondary" disabled={isProcessingAction || isLoadingData}>
                                {isEditing ? 'Cancelar Edición' : 'Limpiar Formulario'}
                            </button>
                        </div>
                    </form>
                </section>

                <div className="lessons-list-wrapper">
                    <h2><LessonIcon className="icon-sm"/> Lecciones Creadas ({lessons.length})</h2>
                    {isLoadingData && lessons.length === 0 && <p className="loading-text">Cargando lecciones...</p>}
                    {!isLoadingData && lessons.length === 0 && !error && (
                        <p className="empty-state-lessons">No hay lecciones creadas. Utiliza el formulario para crear la primera.</p>
                    )}
                    {lessons.length > 0 && (
                        <ul className="lessons-list">
                            {lessons.map(lesson => (
                                <li key={lesson.id} className="lesson-item">
                                    <div className="lesson-info">
                                        <span className="lesson-name">{lesson.name}</span>
                                        <span className="lesson-description">{lesson.description || "Sin descripción"}</span>
                                        <div className="lesson-details">
                                            <span>Total Pregs: {lesson.total_questions !== undefined ? lesson.total_questions : 'N/A'}</span>
                                            <span>Grupos Asig: {lesson.assigned_student_groups_count !== undefined ? lesson.assigned_student_groups_count : 0}</span>
                                        </div>
                                    </div>
                                    <div className="lesson-actions">
                                        <button onClick={() => handleOpenEditForm(lesson)} className="action-btn-sm edit-btn" title="Editar Lección"><EditIcon /></button>
                                        <button onClick={() => openDeleteLessonModal(lesson)} className="action-btn-sm delete-btn" title="Eliminar Lección" disabled={isProcessingAction}><TrashIcon /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!lessonToDelete}
                onClose={() => setLessonToDelete(null)}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar la lección "${lessonToDelete?.name || ''}"? Esta acción no se puede deshacer.`}
                onConfirm={confirmDeleteLesson}
                isProcessing={isProcessingAction}
            />
        </div>
    );
}

export default ManageLessonsPage;
