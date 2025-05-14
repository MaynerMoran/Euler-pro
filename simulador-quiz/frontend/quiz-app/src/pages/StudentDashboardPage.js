// src/pages/StudentDashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './StudentDashboardPage.css'; 

// Iconos
const BookOpenIcon = () => <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m0 0a8.485 8.485 0 0011.925 0M12 17.747a8.485 8.485 0 01-11.925 0M12 6.253a8.485 8.485 0 010-5.494m0 5.494a8.485 8.485 0 000 5.494m0-5.494L5.025 3.732m6.95 2.521L18.975 3.732M5.025 3.732L3.06 6.68m15.88-2.948L20.94 6.68M3.06 6.68L12 17.747l8.94-11.067M3.06 6.68l8.94 2.564M20.94 6.68l-8.94 2.564"></path></svg>;
const ClipboardListIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>;
// ChartBarIcon ya no se usa para un título de sección separado

function StudentDashboardPage() {
    const [assignedLessons, setAssignedLessons] = useState([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);
    const [errorLessons, setErrorLessons] = useState('');
    
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId'); 

    const fetchAssignedLessons = useCallback(async () => {
        if (!userId) {
            setErrorLessons("No se pudo identificar al usuario.");
            return;
        }
        setIsLoadingLessons(true);
        setErrorLessons('');
        try {
            const response = await fetch(`/api/student/assigned_lessons?user_id=${userId}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errData.error || `Error ${response.status} al cargar lecciones asignadas`);
            }
            const data = await response.json();
            setAssignedLessons(data);
        } catch (err) {
            console.error("Error fetching assigned lessons:", err);
            setErrorLessons(err.message || 'No se pudo cargar las lecciones asignadas.');
        } finally {
            setIsLoadingLessons(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAssignedLessons();
    }, [fetchAssignedLessons]);

    const handleStartLesson = (lessonId) => {
        navigate(`/quiz/lesson/${lessonId}`);
    };

    return (
        <div className="student-dashboard-page page-container">
            <header className="student-dashboard-header">
                <h1><BookOpenIcon /> Mi Panel de Estudiante</h1>
                <p>Bienvenido/a. Aquí puedes ver tus lecciones asignadas y tu progreso.</p>
            </header>

            <div className="dashboard-main-content"> {/* Layout principal de una columna */}
                <section className="dashboard-section assigned-lessons-section">
                    <h2><ClipboardListIcon /> Lecciones Asignadas y Progreso</h2>
                    {isLoadingLessons && <p className="loading-text">Cargando lecciones...</p>}
                    {errorLessons && <p className="error-message">{errorLessons}</p>}
                    {!isLoadingLessons && !errorLessons && (
                        assignedLessons.length === 0 ? (
                            <p className="empty-state">No tienes lecciones asignadas por el momento.</p>
                        ) : (
                            <ul className="lessons-list">
                                {assignedLessons.map(lesson => {
                                    const chartData = (lesson.all_scores && lesson.all_scores.length > 0) 
                                        ? lesson.all_scores.map((score, index) => ({
                                            name: (index + 1).toString(), 
                                            calificacion: score,
                                          }))
                                        : [];

                                    return (
                                        <li key={lesson.id} className="lesson-item-student with-progress">
                                            {/* Información principal de la lección */}
                                            <div className="lesson-item-main-info">
                                                <div className="lesson-info">
                                                    <h3>{lesson.name}</h3>
                                                    <p>{lesson.description || 'Sin descripción adicional.'}</p>
                                                    <span className="lesson-meta">
                                                        Total Preguntas: {lesson.total_questions || 'N/A'} | Intentos: {lesson.attempts || 0} | Mejor Puntaje: {lesson.best_score || 0}%
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => handleStartLesson(lesson.id)} 
                                                    className="action-button start-lesson-button"
                                                >
                                                    {lesson.attempts > 0 ? 'Volver a Intentar' : 'Comenzar Lección'}
                                                </button>
                                            </div>

                                            {/* Contenedor de la gráfica, se muestra si hay intentos y datos */}
                                            {lesson.attempts > 0 && chartData.length > 0 && (
                                                <div className="lesson-progress-chart-container-integrated">
                                                    <ResponsiveContainer width="100%" height={150}> 
                                                        <LineChart
                                                            data={chartData}
                                                            margin={{ top: 15, right: 20, left: -25, bottom: 0 }} 
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" fontSize="0.65rem" /> 
                                                            <YAxis domain={[0, 100]} fontSize="0.65rem" />
                                                            <Tooltip 
                                                                formatter={(value) => [`${value}%`, "Calificación"]}
                                                                labelFormatter={(label) => `Intento ${label}`} 
                                                            />
                                                            <Line type="monotone" dataKey="calificacion" name="Calificación" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 5 }} dot={{r: 2}} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}
                                             {lesson.attempts > 0 && chartData.length === 0 && (
                                                <p className="empty-state-small chart-info-text">No hay datos de calificación para mostrar la gráfica de esta lección.</p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )
                    )}
                </section>
            </div>
             <div className="history-link-container"> {/* Botón de historial fuera del layout principal */}
                <Link to="/history" className="action-button-outline view-history-link-standalone">
                    Ver Mi Historial Detallado Completo
                </Link>
            </div>
        </div>
    );
}

export default StudentDashboardPage;
