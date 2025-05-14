// src/pages/GroupStatisticsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import './GroupStatisticsPage.css'; // Crearemos este archivo CSS

// Iconos (puedes importar o definir aquí)
const ArrowLeftIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>;
const UsersIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>;
const ChartBarIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>;
const BookOpenIcon = () => <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v11.494m0 0a8.485 8.485 0 0011.925 0M12 17.747a8.485 8.485 0 01-11.925 0M12 6.253a8.485 8.485 0 010-5.494m0 5.494a8.485 8.485 0 000 5.494m0-5.494L5.025 3.732m6.95 2.521L18.975 3.732M5.025 3.732L3.06 6.68m15.88-2.948L20.94 6.68M3.06 6.68L12 17.747l8.94-11.067M3.06 6.68l8.94 2.564M20.94 6.68l-8.94 2.564"></path></svg>;


function GroupStatisticsPage() {
    const { groupId } = useParams();
    const [groupData, setGroupData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchGroupStatistics = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/admin/statistics/group/${groupId}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
                throw new Error(errData.error || `Error ${response.status} al cargar estadísticas del grupo`);
            }
            const data = await response.json();
            setGroupData(data);
        } catch (err) {
            console.error("Error fetching group statistics:", err);
            setError(err.message || 'No se pudo cargar la información del grupo.');
        } finally {
            setIsLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchGroupStatistics();
    }, [fetchGroupStatistics]);

    if (isLoading) {
        return <div className="loading-text page-container">Cargando estadísticas del grupo...</div>;
    }

    if (error) {
        return <div className="error-message global-feedback page-container">{error}</div>;
    }

    if (!groupData) {
        return <div className="empty-state page-container">No se encontraron datos para este grupo.</div>;
    }

    const { group_info, overall_statistics, members_performance, performance_by_question_group } = groupData;

    return (
        <div className="group-statistics-page page-container">
            <Link to="/admin/dashboard" className="back-link">
                <ArrowLeftIcon /> Volver al Panel de Estadísticas
            </Link>

            <header className="group-stats-header">
                <h1>Estadísticas: {group_info?.name || 'Grupo Desconocido'}</h1>
                <p>{group_info?.description || 'Sin descripción.'}</p>
                <p><strong>Miembros:</strong> {group_info?.member_count || 0}</p>
            </header>

            <section className="stats-section overall-summary-card">
                <h2><ChartBarIcon /> Resumen General del Grupo</h2>
                {overall_statistics ? (
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{overall_statistics.total_evaluations_taken}</span>
                            <span className="stat-label">Evaluaciones Realizadas</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{overall_statistics.average_score?.toFixed(2) || 0}%</span>
                            <span className="stat-label">Promedio General</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{overall_statistics.total_correct || 0}</span>
                            <span className="stat-label">Resp. Correctas Totales</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{overall_statistics.total_incorrect || 0}</span>
                            <span className="stat-label">Resp. Incorrectas Totales</span>
                        </div>
                    </div>
                ) : <p>No hay datos generales de evaluación para este grupo.</p>}
            </section>

            <section className="stats-section members-list-card">
                <h2><UsersIcon /> Rendimiento de Miembros</h2>
                {members_performance && members_performance.length > 0 ? (
                    <ul className="members-list">
                        {members_performance.map(member => (
                            <li key={member.student_id} className="member-item">
                                <span className="member-name">{member.student_name}</span>
                                <div className="member-stats">
                                    <span>Evaluaciones: {member.evaluations_taken}</span>
                                    <span>Promedio: {member.average_score?.toFixed(2) || 0}%</span>
                                </div>
                                {/* TODO: Enlace a estadísticas detalladas del estudiante */}
                                {/* <Link to={`/admin/statistics/student/${member.student_id}?groupId=${groupId}`}>Ver Detalles</Link> */}
                            </li>
                        ))}
                    </ul>
                ) : <p>No hay datos de rendimiento de miembros o el grupo no tiene miembros con evaluaciones.</p>}
            </section>
            
            <section className="stats-section topics-performance-card">
                 <h2><BookOpenIcon /> Rendimiento por Temas (Grupos de Preguntas)</h2>
                 {performance_by_question_group && performance_by_question_group.length > 0 ? (
                    <ul className="topics-list">
                        {performance_by_question_group.map(qg_perf => (
                            <li key={qg_perf.question_group_id} className="topic-item">
                                <span className="topic-name">{qg_perf.question_group_name}</span>
                                <div className="topic-stats">
                                    <span>Precisión: {qg_perf.accuracy_percentage?.toFixed(2) || 0}%</span>
                                    <span>(Correctas: {qg_perf.total_correct_in_group} de {qg_perf.total_answered_in_group})</span>
                                </div>
                                {/* Aquí se podría añadir una barra de progreso simple */}
                                <div className="progress-bar-container">
                                    <div 
                                        className="progress-bar-fill" 
                                        style={{ width: `${qg_perf.accuracy_percentage || 0}%`}} 
                                        title={`${qg_perf.accuracy_percentage?.toFixed(2) || 0}%`}
                                    >
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                 ) : <p>No hay datos de rendimiento por temas para este grupo.</p>}
            </section>
        </div>
    );
}

export default GroupStatisticsPage;
