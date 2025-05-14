// src/pages/AdminDashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Para futuros enlaces a detalles
import './AdminDashboardPage.css'; // Crearemos este archivo CSS

// Iconos (puedes reutilizar los que ya tienes o añadir nuevos)
const GroupIcon = () => <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0a5.002 5.002 0 019.5 0M12 15a5 5 0 110-10 5 5 0 010 10z"></path></svg>;
const UsersIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>;


function AdminDashboardPage() {
    const [studentGroups, setStudentGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchStudentGroupsOverview = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Asumimos que el token de admin se maneja globalmente o no es estrictamente necesario para este endpoint de solo lectura
            // Si es necesario, deberías añadirlo a los headers:
            // headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            const response = await fetch('/api/admin/statistics/student_groups_overview');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errData.error || `Error ${response.status} al cargar grupos`);
            }
            const data = await response.json();
            setStudentGroups(data);
        } catch (err) {
            console.error("Error fetching student groups overview:", err);
            setError(err.message || 'No se pudo cargar el resumen de grupos de estudiantes.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStudentGroupsOverview();
    }, [fetchStudentGroupsOverview]);

    return (
        <div className="admin-dashboard-page">
            <header className="dashboard-header">
                <h1><GroupIcon /> Panel de Estadísticas del Administrador</h1>
                <p>Supervisa el progreso y rendimiento de los grupos de estudiantes.</p>
            </header>

            {isLoading && <p className="loading-text">Cargando datos de grupos...</p>}
            {error && <p className="error-message global-feedback">{error}</p>}

            {!isLoading && !error && (
                <section className="student-groups-overview-section">
                    <h2>Resumen de Grupos de Estudiantes ({studentGroups.length})</h2>
                    {studentGroups.length === 0 ? (
                        <p className="empty-state">No hay grupos de estudiantes creados todavía.</p>
                    ) : (
                        <div className="groups-grid">
                            {studentGroups.map(group => (
                                <div key={group.id} className="group-card">
                                    <h3>{group.name}</h3>
                                    <p className="group-description">{group.description || 'Sin descripción.'}</p>
                                    <div className="group-meta">
                                        <span><UsersIcon /> {group.member_count} Miembro(s)</span>
                                        {/* Aquí se añadirán más estadísticas en el futuro */}
                                    </div>
                                    <div className="group-actions">
                                        {/* TODO: Enlace a la página de estadísticas detalladas del grupo */}
                                        <Link to={`/admin/statistics/group/${group.id}`} className="action-button view-stats-button">
                                            Ver Estadísticas
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

export default AdminDashboardPage;
