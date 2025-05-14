// src/pages/ManageContentPage.js
// Página para administrar Grupos de Preguntas y Preguntas, con subida de imágenes.

import React, { useState, useEffect, useCallback } from 'react';
import './ManageContentPage.css'; 

// Iconos (asegúrate de que estos componentes SVG estén definidos o importados correctamente)
const FolderIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>;
const QuestionIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M9 12l-2-2m2 2l2-2m-2 2v-2m2 2h-2"></path><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l-2-2m2 2l2-2m-2 2V7a2 2 0 012-2h2a2 2 0 012 2v3m-2 3h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2m0-3l2-2m-2 2l-2-2"></path></svg>;
const PlusCircleIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const EditIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;
const TrashIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
const ImageIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>;


// Componente Modal Genérico
const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content modal-${size}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h2>{title}</h2><button onClick={onClose} className="modal-close-button" aria-label="Cerrar modal">&times;</button></div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

const initialNewQuestionState = {
    texto_pregunta: '',
    opcionesRaw: '', 
    opciones: [],      
    respuesta_correcta_indice: 0, 
    procedimiento_resolucion: '',
    question_group_id: '',
    imagen_pregunta_file: null, 
    imagen_url_actual: null, 
    eliminar_imagen_actual: false 
};

const API_BASE_URL = ''; 

function ManageContentPage() {
    const [questionGroups, setQuestionGroups] = useState([]);
    const [isLoadingQGroups, setIsLoadingQGroups] = useState(false);
    const [showQGroupModal, setShowQGroupModal] = useState(false);
    const [currentQGroup, setCurrentQGroup] = useState(null);
    const [qGroupName, setQGroupName] = useState('');

    const [questions, setQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(null); 
    const [newQuestionData, setNewQuestionData] = useState({...initialNewQuestionState});
    const [filterGroupId, setFilterGroupId] = useState(''); 
    const [lastSelectedGroupId, setLastSelectedGroupId] = useState(''); 
    const [imagePreview, setImagePreview] = useState(null); 

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const showFeedback = (message, type = 'success', duration = 4000) => {
        if (type === 'success') { setSuccessMessage(message); setError(null); }
        else { setError(message); setSuccessMessage(null); }
        setTimeout(() => { setSuccessMessage(''); setError(''); }, duration);
    };

    const fetchQuestionGroups = useCallback(async () => {
        setIsLoadingQGroups(true);
        try {
            const response = await fetch('/api/admin/question_groups');
            if (!response.ok) throw new Error('Error al cargar grupos de preguntas');
            const data = await response.json();
            setQuestionGroups(data);
            
            const currentLastSelectedGroupId = lastSelectedGroupId;
            const isValidLastGroup = data.some(g => g.id.toString() === currentLastSelectedGroupId);

            if (data.length > 0 && (!currentLastSelectedGroupId || !isValidLastGroup)) {
                const defaultGroup = data[0].id.toString();
                setLastSelectedGroupId(defaultGroup);
                if (!currentQuestion && !showQuestionModal) { 
                    setNewQuestionData(prev => ({...prev, question_group_id: defaultGroup}));
                }
            } else if (data.length === 0) {
                setLastSelectedGroupId(''); 
            }
        } catch (err) { showFeedback(err.message, 'error'); } 
        finally { setIsLoadingQGroups(false); }
    }, [lastSelectedGroupId, currentQuestion, showQuestionModal]); 

    const handleOpenQGroupModal = (group = null) => {
        setCurrentQGroup(group);
        setQGroupName(group ? group.name : '');
        setShowQGroupModal(true);
        setError(null); setSuccessMessage('');
    };

    const handleSaveQuestionGroup = async (e) => {
        e.preventDefault();
        if (!qGroupName.trim()) { showFeedback('El nombre del grupo no puede estar vacío.', 'error'); return; }
        setIsProcessing(true);
        const url = currentQGroup ? `/api/admin/question_groups/${currentQGroup.id}` : '/api/admin/question_groups';
        const method = currentQGroup ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: qGroupName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al guardar grupo.');
            showFeedback(data.message || `Grupo ${currentQGroup ? 'actualizado' : 'creado'}.`, 'success');
            fetchQuestionGroups();
            setShowQGroupModal(false);
        } catch (err) { showFeedback(err.message, 'error'); }
        finally { setIsProcessing(false); }
    };
    
    const handleDeleteQuestionGroup = async (groupId, groupName) => {
        if (!window.confirm(`¿Seguro que quieres eliminar el grupo "${groupName}"? Las preguntas asociadas no se eliminarán, pero perderán su asignación a este grupo.`)) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/question_groups/${groupId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al eliminar grupo.');
            showFeedback(data.message || 'Grupo eliminado.', 'success');
            fetchQuestionGroups();
            if (filterGroupId === groupId.toString()) setFilterGroupId('');
            if (lastSelectedGroupId === groupId.toString()) setLastSelectedGroupId(questionGroups.length > 1 ? questionGroups.find(g => g.id.toString() !== groupId.toString())?.id.toString() || '' : '');
        } catch (err) { showFeedback(err.message, 'error'); }
        finally { setIsProcessing(false); }
    };

    const fetchQuestions = useCallback(async (groupIdToFetch = null) => {
        setIsLoadingQuestions(true);
        let url = '/api/admin/questions'; 
        const currentActiveFilter = groupIdToFetch !== null ? groupIdToFetch : filterGroupId;
        if (currentActiveFilter && currentActiveFilter !== '') {
            url += `?question_group_id=${currentActiveFilter}`;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al cargar preguntas');
            const data = await response.json();
            setQuestions(data);
        } catch (err) { showFeedback(err.message, 'error'); setQuestions([]); } 
        finally { setIsLoadingQuestions(false); }
    }, [filterGroupId]); 

    useEffect(() => {
        fetchQuestionGroups();
    }, [fetchQuestionGroups]);

    useEffect(() => {
        fetchQuestions(filterGroupId);
    }, [filterGroupId, fetchQuestions]);


    const handleFilterChange = (e) => {
        const newFilterId = e.target.value;
        setFilterGroupId(newFilterId);
    };

    const handleQuestionFormChange = (e) => {
        const { name, value, type, files, checked } = e.target; 
        
        if (type === 'file') {
            const file = files[0];
            setNewQuestionData(prev => ({ ...prev, imagen_pregunta_file: file, eliminar_imagen_actual: false }));
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => { setImagePreview(reader.result); };
                reader.readAsDataURL(file);
            } else {
                setImagePreview(null);
            }
        } else if (name === 'eliminar_imagen_actual') { 
            setNewQuestionData(prev => ({ ...prev, [name]: checked }));
            if (checked) { 
                setNewQuestionData(prev => ({ ...prev, imagen_pregunta_file: null }));
                setImagePreview(null);
            }
        } else {
            setNewQuestionData(prev => {
                const updatedData = { ...prev, [name]: value };
                if (name === "opcionesRaw") {
                    const currentOpciones = value.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
                    updatedData.opciones = currentOpciones;
                    updatedData.respuesta_correcta_indice = currentOpciones.length > 0 ? 0 : null; 
                }
                if (name === "question_group_id") {
                    setLastSelectedGroupId(value); 
                }
                return updatedData;
            });
        }
    };
    
    const handleOpenQuestionModal = (question = null) => {
        setError(null); setSuccessMessage('');
        setImagePreview(null); 
        if (question) { 
            setCurrentQuestion(question);
            setNewQuestionData({
                texto_pregunta: question.texto_pregunta,
                opcionesRaw: question.opciones.join(', '), 
                opciones: question.opciones, 
                respuesta_correcta_indice: question.respuesta_correcta_indice !== null ? question.respuesta_correcta_indice : 0, 
                procedimiento_resolucion: question.procedimiento_resolucion || '',
                question_group_id: question.question_group_id ? question.question_group_id.toString() : (lastSelectedGroupId || ''),
                imagen_pregunta_file: null,
                imagen_url_actual: question.imagen_url || null, 
                eliminar_imagen_actual: false
            });
            if (question.question_group_id) setLastSelectedGroupId(question.question_group_id.toString());
        } else { 
            setCurrentQuestion(null);
            const defaultGroupId = lastSelectedGroupId || (questionGroups.length > 0 ? questionGroups[0].id.toString() : '');
            setNewQuestionData({...initialNewQuestionState, question_group_id: defaultGroupId, respuesta_correcta_indice: 0 }); 
            if (defaultGroupId) setLastSelectedGroupId(defaultGroupId); 
        }
        setShowQuestionModal(true);
    };

    const handleSaveQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestionData.texto_pregunta.trim()) { showFeedback('El texto de la pregunta no puede estar vacío.', 'error'); return; }
        
        const finalOpciones = newQuestionData.opcionesRaw.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
        if (finalOpciones.length < 1) { 
            showFeedback('Debe haber al menos una opción válida.', 'error'); return; 
        }
        const respuestaCorrectaFinal = 0; 

        setIsProcessing(true);
        
        const formData = new FormData();
        formData.append('texto_pregunta', newQuestionData.texto_pregunta);
        formData.append('opciones', finalOpciones.join(',')); 
        formData.append('respuesta_correcta_indice', respuestaCorrectaFinal.toString());
        formData.append('procedimiento_resolucion', newQuestionData.procedimiento_resolucion || '');
        formData.append('question_group_id', newQuestionData.question_group_id ? newQuestionData.question_group_id.toString() : '');
        
        if (newQuestionData.imagen_pregunta_file) {
            formData.append('imagen_pregunta', newQuestionData.imagen_pregunta_file);
        }
        if (currentQuestion && newQuestionData.eliminar_imagen_actual) {
            formData.append('eliminar_imagen_actual', 'true');
        }

        const url = currentQuestion ? `/api/admin/questions/${currentQuestion.id}` : '/api/admin/questions';
        const method = currentQuestion ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData 
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al guardar la pregunta.');
            showFeedback(data.message || `Pregunta ${currentQuestion ? 'actualizada' : 'creada'}.`, 'success');
            fetchQuestions(filterGroupId); 
            
            if (!currentQuestion) { 
                setLastSelectedGroupId(newQuestionData.question_group_id || ''); 
                setNewQuestionData({ 
                    ...initialNewQuestionState,
                    question_group_id: newQuestionData.question_group_id 
                });
                setImagePreview(null);
            } else { 
                setShowQuestionModal(false); 
            }
        } catch (err) { showFeedback(err.message, 'error'); }
        finally { setIsProcessing(false); }
    };

    const handleDeleteQuestion = async (questionId, questionText) => {
        if (!window.confirm(`¿Seguro que quieres eliminar la pregunta "${questionText.substring(0,30)}..."?`)) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al eliminar pregunta.');
            showFeedback(data.message || 'Pregunta eliminada.', 'success');
            fetchQuestions(filterGroupId);
        } catch (err) { showFeedback(err.message, 'error'); }
        finally { setIsProcessing(false); }
    };
    
    return (
        <div className="manage-content-container">
            <header className="content-header"><h1>Gestión de Contenido del Quiz</h1></header>
            {error && <div className="error-message global-feedback" role="alert">{error}</div>}
            {successMessage && <div className="success-message global-feedback" role="alert">{successMessage}</div>}

            <div className="content-layout">
                <section className="content-panel groups-q-panel">
                    <div className="panel-header">
                        <h2><FolderIcon /> Grupos de Preguntas ({questionGroups.length})</h2>
                        <button onClick={() => handleOpenQGroupModal()} className="add-button"><PlusCircleIcon /> Crear Grupo</button>
                    </div>
                    {isLoadingQGroups ? <p className="loading-text">Cargando...</p> : (
                        questionGroups.length === 0 
                        ? <p className="empty-state">No hay grupos. ¡Crea uno!</p>
                        : (<ul className="item-list qgroup-list">
                            {questionGroups.map(group => (
                                <li key={group.id} className={`qgroup-item ${filterGroupId === group.id.toString() ? 'active-filter' : ''}`}>
                                    <span onClick={() => handleFilterChange({ target: { value: group.id.toString() } })} className="qgroup-name">{group.name}</span>
                                    <div className="item-actions">
                                        <button onClick={() => handleOpenQGroupModal(group)} className="action-btn-sm edit-btn" title="Editar"><EditIcon /></button>
                                        <button onClick={() => handleDeleteQuestionGroup(group.id, group.name)} className="action-btn-sm delete-btn" title="Eliminar" disabled={isProcessing}><TrashIcon /></button>
                                    </div>
                                </li>
                            ))}</ul>)
                    )}
                </section>

                <section className="content-panel questions-panel">
                     <div className="panel-header">
                        <h2><QuestionIcon /> Preguntas ({questions.length})</h2>
                        <button onClick={() => handleOpenQuestionModal()} className="add-button"><PlusCircleIcon /> Crear Pregunta</button>
                    </div>
                    <div className="filter-controls">
                        <label htmlFor="groupFilter">Filtrar por Grupo:</label>
                        <select id="groupFilter" value={filterGroupId} onChange={handleFilterChange}>
                            <option value="">Todos los Grupos</option>
                            {questionGroups.map(group => (<option key={group.id} value={group.id.toString()}>{group.name}</option>))}
                        </select>
                    </div>
                    {isLoadingQuestions ? <p className="loading-text">Cargando...</p> : (
                        questions.length === 0
                        ? <p className="empty-state">{filterGroupId ? "No hay preguntas en este grupo." : "No hay preguntas creadas."}</p>
                        : (<ul className="item-list question-list">
                            {questions.map(q => (
                                <li key={q.id} className="question-item">
                                    {q.imagen_url && <img src={`${API_BASE_URL}/uploads/${q.imagen_url}`} alt="Visual de pregunta" className="question-thumbnail"/>}
                                    <div className="question-text-preview">{q.texto_pregunta}</div>
                                    <div className="question-details-preview">
                                        <span>Grupo: {q.group_name || "N/A"}</span>
                                        <span>Opciones: {q.opciones.length}</span>
                                        <span>Correcta: Op. {q.respuesta_correcta_indice !== null ? q.respuesta_correcta_indice + 1 : "N/A"}</span>
                                    </div>
                                    <div className="item-actions">
                                        <button onClick={() => handleOpenQuestionModal(q)} className="action-btn-sm edit-btn" title="Editar"><EditIcon /></button>
                                        <button onClick={() => handleDeleteQuestion(q.id, q.texto_pregunta)} className="action-btn-sm delete-btn" title="Eliminar" disabled={isProcessing}><TrashIcon /></button>
                                    </div>
                                </li>
                            ))}</ul>)
                    )}
                </section>
            </div>

            <Modal isOpen={showQGroupModal} onClose={() => setShowQGroupModal(false)} title={currentQGroup ? "Editar Grupo de Preguntas" : "Crear Grupo de Preguntas"}>
                <form onSubmit={handleSaveQuestionGroup} className="modal-form">
                    <div className="form-field-modal"><label htmlFor="qGroupNameInput">Nombre:</label><input type="text" id="qGroupNameInput" value={qGroupName} onChange={(e) => setQGroupName(e.target.value)} required /></div>
                    <div className="modal-form-actions">
                        <button type="button" onClick={() => setShowQGroupModal(false)} className="form-button secondary" disabled={isProcessing}>Cancelar</button>
                        <button type="submit" className="form-button primary" disabled={isProcessing}>{isProcessing ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title={currentQuestion ? "Editar Pregunta" : "Crear Nueva Pregunta"} size="lg">
                <form onSubmit={handleSaveQuestion} className="modal-form question-modal-form" encType="multipart/form-data">
                    <div className="form-field-modal"><label htmlFor="texto_pregunta">Texto de la Pregunta:</label><textarea id="texto_pregunta" name="texto_pregunta" value={newQuestionData.texto_pregunta} onChange={handleQuestionFormChange} rows="3" required /></div>
                    
                    <div className="form-field-modal">
                        <label htmlFor="imagen_pregunta_file"><ImageIcon /> Imagen de la Pregunta (Opcional):</label>
                        <input type="file" id="imagen_pregunta_file" name="imagen_pregunta_file" accept="image/png, image/jpeg, image/gif" onChange={handleQuestionFormChange} />
                        {imagePreview && <img src={imagePreview} alt="Vista previa" className="image-preview-modal"/>}
                        {!imagePreview && newQuestionData.imagen_url_actual && (
                            <div className="current-image-container">
                                <img src={`${API_BASE_URL}/uploads/${newQuestionData.imagen_url_actual}`} alt="Imagen actual" className="image-preview-modal"/>
                                <label className="checkbox-inline">
                                    <input type="checkbox" name="eliminar_imagen_actual" checked={newQuestionData.eliminar_imagen_actual} onChange={handleQuestionFormChange} />
                                    Eliminar imagen actual
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="form-field-modal"><label htmlFor="opcionesRaw">Opciones (separadas por coma ","):</label><input type="text" id="opcionesRaw" name="opcionesRaw" value={newQuestionData.opcionesRaw} onChange={handleQuestionFormChange} placeholder="Opción A, Opción B, Opción C" required /></div>
                    
                    {/* SECCIÓN DE VISTA PREVIA DE OPCIONES GENERADAS */}
                    {newQuestionData.opciones && newQuestionData.opciones.length > 0 && (
                        <div className="parsed-options-preview">
                            <p><strong>Opciones Generadas (La primera es la correcta por defecto):</strong></p>
                            <ol>
                                {newQuestionData.opciones.map((opt, index) => (
                                    <li key={index} className={index === newQuestionData.respuesta_correcta_indice ? 'correct-option-preview' : ''}>
                                        {/* CORRECCIÓN: Solo pasar la opción (opt) a dangerouslySetInnerHTML */}
                                        <span dangerouslySetInnerHTML={{ __html: opt }} /> 
                                        {index === newQuestionData.respuesta_correcta_indice && <em> (Respuesta Correcta)</em>}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {newQuestionData.opciones && newQuestionData.opciones.length < 1 && newQuestionData.opcionesRaw.trim() !== '' && (
                        <p className="input-hint error-hint">Debe ingresar al menos una opción válida.</p>
                    )}
                    {/* FIN DE SECCIÓN DE VISTA PREVIA */}


                    <div className="form-field-modal"><label htmlFor="procedimiento_resolucion">Procedimiento/Enlace Explicativo:</label><input type="text" id="procedimiento_resolucion" name="procedimiento_resolucion" value={newQuestionData.procedimiento_resolucion} onChange={handleQuestionFormChange} placeholder="https://ejemplo.com/video o explicación..." /></div>
                    <div className="form-field-modal"><label htmlFor="question_group_id">Grupo de Preguntas:</label>
                        <select name="question_group_id" id="question_group_id" value={newQuestionData.question_group_id} onChange={handleQuestionFormChange}>
                            <option value="">-- Sin Grupo --</option>
                            {questionGroups.map(group => (<option key={group.id} value={group.id.toString()}>{group.name}</option>))}
                        </select>
                    </div>
                    <div className="modal-form-actions">
                        <button type="button" onClick={() => setShowQuestionModal(false)} className="form-button secondary" disabled={isProcessing}>Cancelar</button>
                        <button type="submit" className="form-button primary" disabled={isProcessing}>{isProcessing ? 'Guardando...' : (currentQuestion ? 'Actualizar Pregunta' : 'Crear Pregunta')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default ManageContentPage;
