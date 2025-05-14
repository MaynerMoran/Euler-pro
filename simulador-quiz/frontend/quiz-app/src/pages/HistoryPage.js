// frontend/quiz-app/src/components/HistoryPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Para crear enlaces de navegación
// import './HistoryPage.css'; // Opcional: crea este archivo para estilos específicos si lo necesitas

const API_URL = 'http://localhost:5001'; // Asegúrate que coincida con tu backend

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError('');
      const storedUserId = localStorage.getItem('userId');
      const storedUsername = localStorage.getItem('username');
      
      if (storedUsername) {
        setUsername(storedUsername);
      }

      if (!storedUserId) {
        setError('No se pudo obtener el ID de usuario. Por favor, inicia sesión de nuevo.');
        setIsLoading(false);
        return;
      }

      try {
        // Hacemos la petición GET al endpoint de historial, pasando el user_id como parámetro de consulta
        const response = await axios.get(`${API_URL}/api/history`, {
          params: {
            user_id: storedUserId 
          }
          // Si usaras autenticación por token, lo enviarías en los headers:
          // headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setHistory(response.data);
      } catch (err) {
        console.error("Error al cargar el historial:", err);
        setError(err.response?.data?.message || 'No se pudo cargar el historial.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []); // El array vacío [] significa que este efecto se ejecuta solo una vez, cuando el componente se monta

  if (isLoading) {
    return <div className="container"><p>Cargando historial...</p></div>;
  }

  if (error) {
    return (
      <div className="container">
        <p className="error-message">{error}</p>
        <Link to="/">Volver al Quiz</Link>
      </div>
    );
  }

  return (
    <div className="container history-container"> {/* Puedes añadir una clase 'history-container' a App.css */}
      <h2>Historial de Evaluaciones de {username || 'Usuario'}</h2>
      {history.length === 0 ? (
        <p>Aún no tienes evaluaciones en tu historial.</p>
      ) : (
        history.map(evaluation => (
          <div key={evaluation.evaluation_id} className="history-item"> {/* Puedes añadir una clase 'history-item' a App.css */}
            <h3>Evaluación del: {new Date(evaluation.timestamp).toLocaleString('es-EC', { dateStyle: 'long', timeStyle: 'short' })}</h3>
            <p><strong>Calificación:</strong> {evaluation.score}%</p>
            
            {evaluation.incorrect_answers_details && evaluation.incorrect_answers_details.length > 0 && (
              <div className="incorrect-answers-summary"> {/* Puedes añadir 'incorrect-answers-summary' a App.css */}
                <h4>Detalles de Respuestas Incorrectas:</h4>
                <ul>
                  {evaluation.incorrect_answers_details.map((detail, index) => (
                    <li key={detail.question_id || index}>
                      <p><strong>Pregunta:</strong> {detail.texto_pregunta}</p>
                      <p><em>Tu Respuesta:</em> {detail.tu_respuesta_texto}</p>
                      <p><em>Respuesta Correcta:</em> {detail.respuesta_correcta_texto}</p>
                      {detail.procedimiento && <p><em>Procedimiento:</em> {detail.procedimiento}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
             {(!evaluation.incorrect_answers_details || evaluation.incorrect_answers_details.length === 0) && (
                <p>¡Todas las respuestas fueron correctas en esta evaluación!</p>
            )}
            <hr style={{margin: "20px 0"}} />
          </div>
        ))
      )}
      <Link to="/">Volver al Quiz</Link>
    </div>
  );
}

export default HistoryPage;
