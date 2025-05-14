// src/pages/AdminAllLessonsCatalogPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Usaremos axios si está configurado, sino fetch
import './AdminAllLessonsCatalogPage.css'; // Crearemos este archivo CSS

// Iconos (puedes reutilizar los que ya tienes o añadir nuevos)
const BookOpenIcon = () => <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m0 0a8.485 8.485 0 0011.925 0M12 17.747a8.485 8.485 0 01-11.925 0M12 6.253a8.485 8.485 0 010-5.494m0 5.494a8.485 8.485 0 000 5.494m0-5.494L5.025 3.732m6.95 2.521L18.975 3.732M5.025 3.732L3.06 6.68m15.88-2.948L20.94 6.68M3.06 6.68L12 17.747l8.94-11.067M3.06 6.68l8.94 2.564M20.94 6.68l-8.94 2.564"></path></svg>;
const EyeIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.002.028-.004.056-.004.084 0 .028.002.056.004.084C20.268 16.057 16.477 19 12 19c-4.478 0-8.268-2.943-9.542-7a1.011 1.011 0 010-.168z"></path></svg>;
const EditIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>;
const ListChecksIcon = () => <svg className="icon-sm" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" ><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


// URL base de la API (debería coincidir con la de App.js)
const API_URL = 'http://localhost:5001'; 

function AdminAllLessonsCatalogPage() {
    const [allLessons, setAllLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchAllLessons = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // El token de admin podría ser necesario aquí si el endpoint está protegido
            // const token = localStorage.getItem('accessToken');
            // const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const response = await axios.get(`${API_URL}/api/admin/lessons` /*, config */);
            setAllLessons(response.data);
        } catch (err) {
            console.error("Error fetching all lessons:", err);
            setError(err.response?.data?.error || 'No se pudo cargar el catálogo de lecciones.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllLessons();
    }, [fetchAllLessons]);

    const handlePreviewQuiz = (lessonId) => {
        // Navega a la vista de quiz normal. 
        // Considerar que esto podría registrar un intento si el QuizView no distingue roles.
        // Una mejora sería tener un modo "preview" en QuizView o un QuizView específico para admin.
        navigate(`/quiz/lesson/${lessonId}?mode=preview`); // Añadir un query param 'mode=preview'
    };
    
    const handleEditLesson = (lessonId) => {
        // Navega a la página de gestión de lecciones, idealmente abriendo esa lección para editar.
        // ManageLessonsPage necesitaría lógica para cargar una lección por ID si se pasa como parámetro o estado.
        // Por ahora, simplemente navega a la página general de gestión de lecciones.
        // Una mejora sería pasar el lessonId y que ManageLessonsPage lo use.
        navigate(`/admin/manage-lessons?edit=${lessonId}`); 
    };


    if (isLoading) {
        return <div className="page-container admin-lessons-catalog-loading"><p>Cargando catálogo de lecciones...</p></div>;
    }

    if (error) {
        return <div className="page-container admin-lessons-catalog-error"><p className="error-message">{error}</p></div>;
    }

    return (
        <div className="page-container admin-lessons-catalog-page">
            <header className="admin-lessons-catalog-header">
                <h1><BookOpenIcon /> Catálogo Completo de Lecciones</h1>
                <p>Visualiza y accede a todas las lecciones creadas en la plataforma.</p>
            </header>

            {allLessons.length === 0 ? (
                <p className="empty-state">No hay lecciones creadas en el sistema.</p>
            ) : (
                <div className="lessons-grid-catalog">
                    {allLessons.map(lesson => (
                        <div key={lesson.id} className="lesson-card-catalog">
                            <h3>{lesson.name}</h3>
                            <p className="lesson-description-catalog">{lesson.description || 'Sin descripción.'}</p>
                            <div className="lesson-meta-catalog">
                                <span><ListChecksIcon /> Preguntas: {lesson.total_questions || 0}</span>
                                <span>Grupos Asignados: {lesson.assigned_student_groups_count || 0}</span>
                            </div>
                            <div className="lesson-actions-catalog">
                                <button 
                                    onClick={() => handlePreviewQuiz(lesson.id)} 
                                    className="action-button preview-button-catalog"
                                    title="Previsualizar el quiz como estudiante"
                                >
                                    <EyeIcon /> Previsualizar Quiz
                                </button>
                                <button 
                                    onClick={() => handleEditLesson(lesson.id)} 
                                    className="action-button edit-button-catalog"
                                    title="Editar detalles de la lección"
                                >
                                    <EditIcon /> Editar Lección
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminAllLessonsCatalogPage;
