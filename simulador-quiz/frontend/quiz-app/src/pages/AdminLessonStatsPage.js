// src/pages/AdminLessonStatsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Si necesitas enlaces
import './AdminLessonStatsPage.css'; // Crearemos este archivo CSS

// Iconos (puedes reutilizar o añadir nuevos según necesites)
const TrophyIcon = () => <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l1.073-1.073a4.5 4.5 0 016.364 0L17.5 6v13m-5-10v10m0 0H6.5m5.5 0H18m-5.5-3.5A2.5 2.5 0 1115 13a2.5 2.5 0 01-2.5 2.5M9 13.5A2.5 2.5 0 106.5 16a2.5 2.5 0 002.5-2.5m9-2.5A2.5 2.5 0 1115 11a2.5 2.5 0 012.5 2.5M12 6V3m0 0H9m3 0h3"></path></svg>;
const ListIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>;
const UsersIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>;
const ChartBarIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>;


const API_URL = 'http://localhost:5001'; // Asegúrate que coincida con tu backend

function AdminLessonStatsPage() {
    const [allLessons, setAllLessons] = useState([]); // Para el dropdown
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [lessonStats, setLessonStats] = useState(null); // Estadísticas de la lección seleccionada
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Cargar todas las lecciones para el menú desplegable
    const fetchAllLessonsForDropdown = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/api/admin/lessons`); // Reutilizamos el endpoint existente
            setAllLessons(response.data || []);
            if (response.data && response.data.length > 0 && !selectedLessonId) {
                // Opcional: seleccionar la primera lección por defecto, o dejar que el admin elija.
                // setSelectedLessonId(response.data[0].id.toString());
            }
        } catch (err) {
            console.error("Error fetching lessons for dropdown:", err);
            setError(err.response?.data?.error || 'No se pudo cargar la lista de lecciones.');
            setAllLessons([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLessonId]); // selectedLessonId para evitar reseleccionar si ya hay una

    useEffect(() => {
        fetchAllLessonsForDropdown();
    }, [fetchAllLessonsForDropdown]);

    // Cargar estadísticas detalladas cuando se selecciona una lección
    const fetchLessonStatistics = useCallback(async () => {
        if (!selectedLessonId) {
            setLessonStats(null);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // Este endpoint es NUEVO y necesita ser creado en el backend: /api/admin/lesson_statistics/:lessonId
            const response = await axios.get(`${API_URL}/api/admin/lesson_statistics/${selectedLessonId}`);
            setLessonStats(response.data);
        } catch (err) {
            console.error("Error fetching lesson statistics:", err);
            setError(err.response?.data?.error || `No se pudo cargar las estadísticas para la lección ID ${selectedLessonId}.`);
            setLessonStats(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLessonId]);

    useEffect(() => {
        if (selectedLessonId) {
            fetchLessonStatistics();
        } else {
            setLessonStats(null); 
        }
    }, [selectedLessonId, fetchLessonStatistics]);

    const handleLessonChange = (event) => {
        setSelectedLessonId(event.target.value);
    };

    // Función para formatear nombres o mostrar correo si no hay nombre/apellido
    const formatStudentName = (student) => {
        const name = `${student.nombres || ''} ${student.apellidos || ''}`.trim();
        return name || student.correo || 'Estudiante Desconocido';
    };

    return (
        <div className="admin-lesson-stats-page page-container">
            <header className="admin-lesson-stats-header">
                <h1><ChartBarIcon /> Estadísticas Detalladas por Lección</h1>
                <p>Selecciona una lección para ver su rendimiento general y el de los estudiantes.</p>
            </header>

            <div className="lesson-selector-container-admin">
                <label htmlFor="lesson-select-admin"><ListIcon /> Selecciona una Lección:</label>
                <select
                    id="lesson-select-admin"
                    value={selectedLessonId}
                    onChange={handleLessonChange}
                    disabled={isLoading || allLessons.length === 0}
                >
                    <option value="">-- Elige una lección --</option>
                    {allLessons.map(lesson => (
                        <option key={lesson.id} value={lesson.id.toString()}>
                            {lesson.name}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading && selectedLessonId && <p className="loading-text">Cargando estadísticas de la lección...</p>}
            {error && <p className="error-message global-feedback">{error}</p>}

            {selectedLessonId && !isLoading && lessonStats && (
                <div className="lesson-stats-details-section">
                    <h2>Estadísticas para: {lessonStats.lesson_name || 'Lección Desconocida'}</h2>
                    
                    <div className="overall-lesson-summary">
                        <h3><TrophyIcon /> Resumen General de la Lección</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <span className="summary-value">{lessonStats.total_attempts || 0}</span>
                                <span className="summary-label">Intentos Totales</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{lessonStats.average_score?.toFixed(2) || 0}%</span>
                                <span className="summary-label">Promedio General</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-value">{lessonStats.unique_students_completed || 0}</span>
                                <span className="summary-label">Estudiantes Únicos</span>
                            </div>
                             {/* Podrías añadir más estadísticas aquí, como "Grupos Asignados" si el backend lo provee */}
                        </div>
                    </div>

                    {lessonStats.student_performance && lessonStats.student_performance.length > 0 && (
                        <div className="student-performance-table-section">
                            <h3><UsersIcon /> Rendimiento de Estudiantes en esta Lección</h3>
                            <table className="admin-stats-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nombre del Estudiante</th>
                                        <th>Mejor Puntaje</th>
                                        <th>Intentos</th>
                                        <th>Último Intento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessonStats.student_performance.map((entry, index) => (
                                        <tr key={entry.student_id}>
                                            <td>{index + 1}</td>
                                            <td>{formatStudentName(entry)}</td>
                                            <td>{entry.best_score?.toFixed(2) || 0}%</td>
                                            <td>{entry.attempts_count || 0}</td>
                                            <td>{entry.last_attempt_date ? new Date(entry.last_attempt_date).toLocaleDateString('es-EC') : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                     {(!lessonStats.student_performance || lessonStats.student_performance.length === 0) && (
                        <p className="empty-state small-empty-state">Ningún estudiante ha realizado esta lección aún.</p>
                    )}
                </div>
            )}
            
            {!isLoading && selectedLessonId && !lessonStats && !error && (
                 <p className="empty-state">No se encontraron datos estadísticos para la lección seleccionada.</p>
            )}
            {!selectedLessonId && !isLoading && !error && allLessons.length > 0 && (
                <p className="empty-state">Por favor, selecciona una lección para ver sus estadísticas.</p>
            )}
             {!selectedLessonId && !isLoading && !error && allLessons.length === 0 && (
                <p className="empty-state">No hay lecciones disponibles en el sistema.</p>
            )}
        </div>
    );
}

export default AdminLessonStatsPage;
