// src/pages/PosesionesPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Para volver al dashboard, por ejemplo
import './PosesionesPage.css'; // Asegúrate de que este archivo CSS exista y esté en la misma carpeta

// Iconos (puedes reutilizar o añadir nuevos)
const TrophyIcon = () => <svg className="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l1.073-1.073a4.5 4.5 0 016.364 0L17.5 6v13m-5-10v10m0 0H6.5m5.5 0H18m-5.5-3.5A2.5 2.5 0 1115 13a2.5 2.5 0 01-2.5 2.5M9 13.5A2.5 2.5 0 106.5 16a2.5 2.5 0 002.5-2.5m9-2.5A2.5 2.5 0 1115 11a2.5 2.5 0 012.5 2.5M12 6V3m0 0H9m3 0h3"></path></svg>;
const ListIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>;


function PosesionesPage() {
    const [lessonsForDropdown, setLessonsForDropdown] = useState([]);
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const [rankingData, setRankingData] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Estado de carga general UNIFICADO
    const [error, setError] = useState('');

    const userId = localStorage.getItem('userId');

    // Cargar lecciones para el dropdown
    const fetchLessonsForDropdown = useCallback(async () => {
        if (!userId) {
            setError('No se pudo identificar al usuario.'); // Informar al usuario
            return;
        }
        setIsLoading(true); 
        setError('');
        try {
            const response = await fetch(`/api/student/lessons_for_ranking_dropdown?user_id=${userId}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errData.error || `Error ${response.status} al cargar lecciones`);
            }
            const data = await response.json();
            setLessonsForDropdown(data || []);
        } catch (err) {
            console.error("Error fetching lessons for dropdown:", err);
            setError(err.message || 'No se pudo cargar la lista de lecciones.');
        } finally {
            setIsLoading(false); 
        }
    }, [userId]);

    useEffect(() => {
        fetchLessonsForDropdown();
    }, [fetchLessonsForDropdown]);

    // Cargar detalles del ranking cuando se selecciona una lección
    const fetchRankingDetails = useCallback(async () => {
        if (!selectedLessonId || !userId) {
            setRankingData(null); 
            return;
        }
        setIsLoading(true); 
        setError('');
        try {
            const response = await fetch(`/api/student/lesson_ranking_details/${selectedLessonId}?user_id=${userId}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errData.error || `Error ${response.status} al cargar el ranking`);
            }
            const data = await response.json();
            setRankingData(data);
        } catch (err) {
            console.error("Error fetching ranking details:", err);
            setError(err.message || 'No se pudo cargar el ranking para esta lección.');
            setRankingData(null);
        } finally {
            setIsLoading(false); 
        }
    }, [selectedLessonId, userId]);

    useEffect(() => {
        if (selectedLessonId) {
            fetchRankingDetails();
        } else {
            setRankingData(null); 
        }
    }, [selectedLessonId, fetchRankingDetails]); 

    const handleLessonChange = (event) => {
        setSelectedLessonId(event.target.value);
    };

    return (
        <div className="posesiones-page page-container">
            <header className="posesiones-header">
                <h1><TrophyIcon /> Posesiones en Lecciones</h1>
                <p>Compara tu primer intento con el de tus compañeros de grupo.</p>
            </header>

            <div className="lesson-selector-container">
                <label htmlFor="lesson-select"><ListIcon/> Selecciona una Lección:</label>
                <select 
                    id="lesson-select" 
                    value={selectedLessonId} 
                    onChange={handleLessonChange} 
                    disabled={isLoading || lessonsForDropdown.length === 0} // Usar isLoading general
                >
                    <option value="">-- Elige una lección --</option>
                    {lessonsForDropdown.map(lesson => (
                        <option key={lesson.id} value={lesson.id.toString()}>
                            {lesson.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Mostrar mensaje de carga solo cuando se está cargando el ranking de una lección seleccionada */}
            {isLoading && selectedLessonId && <p className="loading-text">Cargando ranking...</p>}
            {/* Mostrar mensaje de carga general si lessonsForDropdown está vacío y se está cargando inicialmente */}
            {isLoading && lessonsForDropdown.length === 0 && !selectedLessonId && <p className="loading-text">Cargando lecciones disponibles...</p>}
            
            {error && <p className="error-message global-feedback">{error}</p>}

            {selectedLessonId && !isLoading && rankingData && rankingData.rankings && (
                <div className="ranking-details-section">
                    <h2>Ranking para: {rankingData.lesson_name} (Primer Intento)</h2>
                    {rankingData.rankings.length > 0 ? (
                        <table className="ranking-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nombre del Estudiante</th>
                                    <th>Puntaje (1er Intento)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingData.rankings.map((entry, index) => (
                                    <tr key={entry.student_id} className={entry.is_current_user ? 'current-user-row' : ''}>
                                        <td>{index + 1}</td>
                                        <td>{entry.student_name}</td>
                                        <td>{entry.first_attempt_score?.toFixed(2) || 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="empty-state">No hay datos de ranking para esta lección o ningún compañero de tus grupos la ha intentado.</p>
                    )}
                </div>
            )}
            {/* Mensaje si se seleccionó una lección pero no hay datos (y no está cargando ni hay error) */}
            {!isLoading && selectedLessonId && !rankingData && !error && (
                 <p className="empty-state">No se encontraron datos de ranking para la lección seleccionada o aún no hay intentos.</p>
            )}
            {/* Mensaje si no se ha seleccionado ninguna lección (y no está cargando ni hay error) */}
             {!selectedLessonId && !isLoading && !error && lessonsForDropdown.length > 0 && (
                <p className="empty-state">Por favor, selecciona una lección para ver las posiciones.</p>
            )}
             {!selectedLessonId && !isLoading && !error && lessonsForDropdown.length === 0 && !error && (
                <p className="empty-state">No hay lecciones disponibles para mostrar ranking.</p>
            )}
        </div>
    );
}

export default PosesionesPage;
