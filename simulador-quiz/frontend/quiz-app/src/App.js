// frontend/quiz-app/src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Routes, Route, Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import './App.css'; 

// Importar páginas
import CreateUserPage from './pages/CreateUserPage';
import ManageStudentGroupsPage from './pages/ManageStudentGroupsPage';
import ManageUsersPage from './pages/ManageUsersPage'; 
import ManageContentPage from './pages/ManageContentPage'; 
import ManageLessonsPage from './pages/ManageLessonsPage'; 
import AdminDashboardPage from './pages/AdminDashboardPage'; 
import GroupStatisticsPage from './pages/GroupStatisticsPage';
import StudentDashboardPage from './pages/StudentDashboardPage'; 
import PosesionesPage from './pages/PosesionesPage';
import HistoryPage from './pages/HistoryPage'; 
import AdminAllLessonsCatalogPage from './pages/AdminAllLessonsCatalogPage';
import AdminLessonStatsPage from './pages/AdminLessonStatsPage';

const API_URL = 'http://localhost:5001'; 

const AdminProtectedRoute = ({ children }) => {
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();
  if (userRole !== 'administrador') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

const StudentProtectedRoute = ({ children }) => {
    const userRole = localStorage.getItem('userRole');
    const location = useLocation();
    if (userRole !== 'estudiante') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState({
    username: null, id: null, role: null, nombres: null
  });
  const [usernameForLogin, setUsernameForLogin] = useState(''); 
  const [passwordForLogin, setPasswordForLogin] = useState(''); 
  const [loginError, setLoginError] = useState('');
  const [questions, setQuestions] = useState([]); 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); 
  const [quizError, setQuizError] = useState('');
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [quizResults, setQuizResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false); 
  const [isQuizActive, setIsQuizActive] = useState(false); 
  
  const navigate = useNavigate(); 
  const location = useLocation();
  const quizSubmitInProgress = useRef(false);
  const previousPathRef = useRef(location.pathname); 

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');
    const storedUserRole = localStorage.getItem('userRole');
    const storedNombres = localStorage.getItem('userNombres'); 

    if (token && storedUsername && storedUserId && storedUserRole) {
      setIsAuthenticated(true);
      setLoggedInUser({
        username: storedUsername, 
        id: storedUserId, 
        role: storedUserRole, 
        nombres: storedNombres || storedUsername 
      });
    } else {
      setIsAuthenticated(false); 
    }
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault(); 
    setLoginError(''); 
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        correo: usernameForLogin, 
        password: passwordForLogin
      });
      const { access_token, username, user_id, role, nombres } = response.data;
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('username', username); 
      localStorage.setItem('userId', user_id);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userNombres', nombres || username); 
      
      setLoggedInUser({ username, id: user_id, role, nombres: nombres || username });
      setIsAuthenticated(true);
      
      setQuizResults(null); 
      setQuestions([]); 
      setCurrentQuestionIndex(0); 
      setSelectedAnswers({}); 
      setCurrentLessonId(null);
      setIsQuizActive(false); 
      quizSubmitInProgress.current = false;
      
      if (role === 'administrador') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard'); 
      }
    } catch (error) {
      console.error("Error en el login:", error.response || error.message);
      setLoginError(error.response?.data?.error || 'Error al iniciar sesión. Verifica tus credenciales.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestionsForLesson = useCallback(async (lessonId) => {
    if (!isAuthenticated || !lessonId) return; 
    setQuizError(''); 
    setIsLoading(true); 
    setCurrentLessonId(lessonId);
    quizSubmitInProgress.current = false; 
    
    const currentQueryParams = new URLSearchParams(location.search);
    const mode = currentQueryParams.get('mode');
    const currentUserId = loggedInUser.id || localStorage.getItem('userId');

    try {
      const response = await axios.get(`${API_URL}/api/questions?lesson_id=${lessonId}&user_id=${currentUserId}`);
      
      const processedQuestions = response.data.map(q => {
        let shuffledDisplayOptions = [...q.opciones]; 
        for (let i = shuffledDisplayOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledDisplayOptions[i], shuffledDisplayOptions[j]] = [shuffledDisplayOptions[j], shuffledDisplayOptions[i]];
        }
        return { ...q, opciones_mostradas: shuffledDisplayOptions };
      });

      setQuestions(processedQuestions);
      setSelectedAnswers({}); 
      setCurrentQuestionIndex(0);
      if (!(mode === 'preview' && loggedInUser.role === 'administrador')) {
        setIsQuizActive(true); 
      } else {
        setIsQuizActive(false);
        console.log("Modo Previsualización para Admin activado para la lección:", lessonId);
      }

    } catch (error)
    {
      console.error("Error al cargar preguntas para la lección:", error);
      setQuizError(error.response?.data?.error || 'No se pudieron cargar las preguntas para esta lección.');
      setQuestions([]); 
      setIsQuizActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loggedInUser.id, loggedInUser.role, location.search]);

  const handleOptionSelect = useCallback((questionId, selectedOptionIndexInShuffledArray) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: selectedOptionIndexInShuffledArray }));
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    if (quizSubmitInProgress.current) return; 
    quizSubmitInProgress.current = true;
    setIsQuizActive(false); 

    const currentQueryParams = new URLSearchParams(location.search);
    const mode = currentQueryParams.get('mode');
    if (mode === 'preview' && loggedInUser.role === 'administrador') {
        console.log("Envío de quiz bloqueado: Modo Previsualización para Admin.");
        quizSubmitInProgress.current = false;
        navigate('/admin/lessons-catalog'); 
        return; 
    }

    if (questions.length === 0) { 
        console.warn('No hay preguntas para enviar.'); 
        quizSubmitInProgress.current = false;
        return;
    }
    
    setIsLoading(true); 
    setQuizError('');
    try {
      const allAnswers = { ...selectedAnswers };
      questions.forEach(q => {
        if (allAnswers[q.id] === undefined) {
          allAnswers[q.id] = -1; 
        }
      });

      const finalAnswersPayload = questions.map(q => {
        const selectedIndexInShuffled = allAnswers[q.id]; 
        let originalIndexOfSelectedOption = -1; 

        if (selectedIndexInShuffled !== undefined && selectedIndexInShuffled !== -1) {
            const selectedOptionText = q.opciones_mostradas[selectedIndexInShuffled];
            originalIndexOfSelectedOption = q.opciones.findIndex(opt => opt === selectedOptionText);
        } else {
            originalIndexOfSelectedOption = -1; 
        }
        
        return {
            question_id: q.id,
            selected_option_index: originalIndexOfSelectedOption 
        };
      });

      const currentUserId = loggedInUser.id || localStorage.getItem('userId');
      if (!currentUserId) {
        setQuizError('ID de usuario no encontrado. Por favor, inicia sesión de nuevo.'); 
        setIsLoading(false); 
        quizSubmitInProgress.current = false;
        return;
      }
      const payload = {
          answers: finalAnswersPayload, 
          user_id: parseInt(currentUserId), 
          lesson_id: currentLessonId 
      };
      const response = await axios.post(`${API_URL}/api/submit_evaluation`, payload);
      setQuizResults(response.data); 
      navigate('/results'); 
    } catch (error) {
      console.error("Error al enviar evaluación:", error);
      setQuizError(error.response?.data?.error || 'Error al enviar la evaluación. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
      quizSubmitInProgress.current = false; 
    }
  }, [questions, selectedAnswers, loggedInUser.role, loggedInUser.id, currentLessonId, navigate, location.search]); 

  const handleNextQuestion = useCallback(() => {
    // console.log(`App: handleNextQuestion called. Current index: ${currentQuestionIndex}, Total questions: ${questions.length}`);
    const currentQueryParams = new URLSearchParams(location.search);
    const mode = currentQueryParams.get('mode');
    const isAdminPreview = mode === 'preview' && loggedInUser.role === 'administrador';

    if (currentQuestionIndex < questions.length - 1) {
        // console.log(`App: Advancing to index ${currentQuestionIndex + 1}`);
        setCurrentQuestionIndex(prev => {
            // console.log(`App: setCurrentQuestionIndex from ${prev} to ${prev + 1}`);
            return prev + 1;
        });
    } else { 
        if (!isAdminPreview) {
            handleSubmitQuiz(); 
        } else {
            console.log("Fin de la previsualización de la lección.");
            setIsQuizActive(false); 
            quizSubmitInProgress.current = false;
            navigate('/admin/lessons-catalog'); 
        }
    }
  }, [currentQuestionIndex, questions.length, loggedInUser.role, location.search, navigate, handleSubmitQuiz]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isAdminPreview = new URLSearchParams(location.search).get('mode') === 'preview' && loggedInUser.role === 'administrador';
      if (document.visibilityState === 'hidden' && !isAdminPreview && isQuizActive && questions.length > 0 && !quizResults && !quizSubmitInProgress.current) {
        console.log("Visibilidad cambiada (pestaña/ventana oculta), enviando quiz...");
        handleSubmitQuiz();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isQuizActive, questions, quizResults, handleSubmitQuiz, loggedInUser.role, location.search]);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    
    const isOnQuizPage = (path) => path.startsWith('/quiz/lesson/');
    const isAdminPreview = new URLSearchParams(location.search).get('mode') === 'preview' && loggedInUser.role === 'administrador';

    if (
      !isAdminPreview &&                    
      isQuizActive &&                       
      questions.length > 0 &&               
      !quizResults &&                       
      !quizSubmitInProgress.current &&      
      isOnQuizPage(previousPath) &&         
      !isOnQuizPage(currentPath) &&         
      currentPath !== '/results'            
    ) {
      console.log('Navegación interna detectada fuera del quiz activo. Enviando quiz...');
      handleSubmitQuiz();
    }

    previousPathRef.current = currentPath;

  }, [location.pathname, isQuizActive, questions, quizResults, loggedInUser.role, handleSubmitQuiz, location.search]);

  const handleLogout = () => {
    const isAdminPreview = new URLSearchParams(location.search).get('mode') === 'preview' && loggedInUser.role === 'administrador';
    if (!isAdminPreview && isQuizActive && questions.length > 0 && !quizResults && !quizSubmitInProgress.current) {
        console.log("Cerrando sesión durante quiz activo. Enviando quiz...");
        handleSubmitQuiz(); 
    }

    localStorage.removeItem('accessToken'); 
    localStorage.removeItem('username');
    localStorage.removeItem('userId'); 
    localStorage.removeItem('userRole');
    localStorage.removeItem('userNombres');
    
    setIsAuthenticated(false); 
    setUsernameForLogin(''); 
    setPasswordForLogin('');
    setLoggedInUser({ username: null, id: null, role: null, nombres: null });
    setQuestions([]); 
    setQuizResults(null); 
    setLoginError(''); 
    setQuizError(''); 
    setCurrentLessonId(null);
    setIsQuizActive(false);
    quizSubmitInProgress.current = false;
    
    navigate('/login'); 
  };

  const Navbar = () => {
    const currentPath = useLocation().pathname;
    const [openDropdown, setOpenDropdown] = useState(null); 
    const dropdownRef = useRef(null); 

    const toggleDropdown = (dropdownName) => {
      setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setOpenDropdown(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []); 


    const NavLink = ({ to, children, inDropdown = false }) => (
      <Link 
        to={to} 
        className={`nav-item ${inDropdown ? 'dropdown-item' : ''} ${currentPath === to || (to !== "/" && currentPath.startsWith(to)) ? 'active' : ''}`}
        onClick={() => setOpenDropdown(null)} 
      >
        {children}
      </Link>
    );
    
    const DropdownArrow = () => <span className="dropdown-arrow">▼</span>;

    return (
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to={isAuthenticated ? (loggedInUser.role === 'administrador' ? "/admin/dashboard" : "/student/dashboard") : "/login"} >
            <img src="/logo.png" alt="EULER PRO Logo" className="nav-logo" />
            <span>EULER PRO</span>
          </Link>
        </div>
        <div className="nav-links-group" ref={dropdownRef}> 
          {isAuthenticated && loggedInUser.role === 'estudiante' && (
            <>
              <NavLink to="/student/dashboard">Mis Lecciones</NavLink>
              <NavLink to="/posesiones">Posesiones</NavLink>
              <NavLink to="/history">Mi Historial</NavLink> 
            </>
          )}
          
          {isAuthenticated && loggedInUser.role === 'administrador' && (
            <>
              <div className="nav-item-dropdown-container">
                <button onClick={() => toggleDropdown('estadisticas')} className={`nav-item dropdown-toggle ${openDropdown === 'estadisticas' ? 'open' : ''}`}>
                  Estadísticas <DropdownArrow/>
                </button>
                {openDropdown === 'estadisticas' && (
                  <div className="dropdown-menu">
                    <NavLink to="/admin/dashboard" inDropdown={true}>Panel Principal</NavLink>
                    <NavLink to="/admin/lesson-stats" inDropdown={true}>Por Lección</NavLink>
                  </div>
                )}
              </div>

              <div className="nav-item-dropdown-container">
                <button onClick={() => toggleDropdown('lecciones')} className={`nav-item dropdown-toggle ${openDropdown === 'lecciones' ? 'open' : ''}`}>
                  Gestión Académica <DropdownArrow/>
                </button>
                {openDropdown === 'lecciones' && (
                  <div className="dropdown-menu">
                    <NavLink to="/admin/lessons-catalog" inDropdown={true}>Catálogo Lecciones</NavLink>
                    <NavLink to="/admin/manage-lessons" inDropdown={true}>Crear/Editar Lecciones</NavLink>
                    <NavLink to="/admin/manage-content" inDropdown={true}>Admin Contenido (Preguntas)</NavLink>
                  </div>
                )}
              </div>
              
              <div className="nav-item-dropdown-container">
                <button onClick={() => toggleDropdown('usuarios')} className={`nav-item dropdown-toggle ${openDropdown === 'usuarios' ? 'open' : ''}`}>
                  Gestión Usuarios <DropdownArrow/>
                </button>
                {openDropdown === 'usuarios' && (
                  <div className="dropdown-menu">
                    <NavLink to="/admin/manage-users" inDropdown={true}>Ver Todos los Usuarios</NavLink>
                    <NavLink to="/admin/create-user" inDropdown={true}>Crear Nuevo Usuario</NavLink>
                    <NavLink to="/admin/student-groups" inDropdown={true}>Admin Grupos Estudiantes</NavLink>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="user-actions">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">Hola, {loggedInUser.nombres || loggedInUser.username} ({loggedInUser.role})</span>
              <button onClick={handleLogout} className="logout-button">Salir</button>
            </>
          ) : (
            currentPath !== "/login" && <NavLink to="/login">Login</NavLink>
          )}
        </div>
      </nav>
    );
  };

  const studentHomePath = '/student/dashboard';
  const adminHomePath = '/admin/dashboard';
  const defaultHomePath = isAuthenticated ? (loggedInUser.role === 'administrador' ? adminHomePath : studentHomePath) : '/login';

  return (
    <div className="App">
      <Navbar />
      <main className="content-area">
        {isLoading && <div className="loading-spinner-overlay"><div className="loading-spinner"></div></div>}
        <Routes>
          <Route path="/login" element={
            !isAuthenticated 
              ? <LoginPage 
                  onLoginSubmit={handleLogin} loginError={loginError} 
                  setUsername={setUsernameForLogin} setPassword={setPasswordForLogin} 
                  username={usernameForLogin} password={passwordForLogin} isLoading={isLoading} /> 
              : <Navigate to={defaultHomePath} replace />
          } />
          
          <Route path="/student/dashboard" element={<StudentProtectedRoute><StudentDashboardPage /></StudentProtectedRoute>} />
          <Route path="/quiz/lesson/:lessonId" element={
            isAuthenticated ? (
              <QuizView 
                questions={questions} 
                currentQuestionIndex={currentQuestionIndex} 
                selectedAnswers={selectedAnswers} 
                onOptionSelect={handleOptionSelect}
                onNextQuestion={handleNextQuestion} 
                quizError={quizError} 
                isLoadingGlobal={isLoading}
                fetchQuestionsForLesson={fetchQuestionsForLesson}
                currentUserRole={loggedInUser.role}
                isQuizActive={isQuizActive} 
                onSubmitQuizExplicit={handleSubmitQuiz} 
              />
            ) : (
              <Navigate to="/login" state={{ from: location }} replace />
            )
          } />
          <Route path="/results" element={
            <StudentProtectedRoute>
              {quizResults ? <ResultsView results={quizResults} /> : <Navigate to={studentHomePath} replace />}
            </StudentProtectedRoute>
          } />
          <Route path="/posesiones" element={<StudentProtectedRoute><PosesionesPage /></StudentProtectedRoute>} />
          <Route path="/history" element={<StudentProtectedRoute><HistoryPage /></StudentProtectedRoute>} />

          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/admin/statistics/group/:groupId" element={<AdminProtectedRoute><GroupStatisticsPage /></AdminProtectedRoute>} />
          <Route path="/admin/create-user" element={<AdminProtectedRoute><CreateUserPage /></AdminProtectedRoute>} />
          <Route path="/admin/manage-users" element={<AdminProtectedRoute><ManageUsersPage /></AdminProtectedRoute>} /> 
          <Route path="/admin/student-groups" element={<AdminProtectedRoute><ManageStudentGroupsPage /></AdminProtectedRoute>} />
          <Route path="/admin/manage-content" element={<AdminProtectedRoute><ManageContentPage /></AdminProtectedRoute>} />
          <Route path="/admin/manage-lessons" element={<AdminProtectedRoute><ManageLessonsPage /></AdminProtectedRoute>} />
          <Route path="/admin/lessons-catalog" element={<AdminProtectedRoute><AdminAllLessonsCatalogPage /></AdminProtectedRoute>} />
          <Route path="/admin/lesson-stats" element={<AdminProtectedRoute><AdminLessonStatsPage /></AdminProtectedRoute>} />
          
          <Route path="*" element={<Navigate to={defaultHomePath} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LoginPage({ onLoginSubmit, loginError, setUsername, setPassword, username, password, isLoading }) {
  const handleSubmit = (e) => { e.preventDefault(); onLoginSubmit(); };
  return (
    <div className="login-page-container">
      <div className="login-form-card">
        <h2 className="login-title">EULER PRO - Acceso</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-correo">Correo Electrónico:</label>
            <input type="text" id="login-correo" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu@correo.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Contraseña:</label>
            <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {loginError && <p className="error-message login-error">{loginError}</p>}
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuizView({ 
    questions, currentQuestionIndex, selectedAnswers, 
    onOptionSelect, 
    onNextQuestion,
    quizError, isLoadingGlobal, fetchQuestionsForLesson,
    currentUserRole,
    isQuizActive, 
    onSubmitQuizExplicit 
}) {
  const { lessonId } = useParams(); 
  const location = useLocation(); 
  
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null); 
  const timerIdRef = React.useRef(null); 
  const quizViewRef = useRef(null); 
  
  const queryParams = new URLSearchParams(location.search);
  const isPreviewMode = queryParams.get('mode') === 'preview' && currentUserRole === 'administrador';

  const onNextQuestionRef = useRef(onNextQuestion);
  const onOptionSelectRef = useRef(onOptionSelect);
  const selectedAnswersRef = useRef(selectedAnswers);
  const currentQuestionIdRef = useRef(questions[currentQuestionIndex]?.id);

  useEffect(() => {
    onNextQuestionRef.current = onNextQuestion;
  }, [onNextQuestion]);

  useEffect(() => {
    onOptionSelectRef.current = onOptionSelect;
  }, [onOptionSelect]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    if (questions && questions.length > 0 && currentQuestionIndex < questions.length) {
        currentQuestionIdRef.current = questions[currentQuestionIndex].id;
    } else {
        currentQuestionIdRef.current = null;
    }
  }, [questions, currentQuestionIndex]);


  useEffect(() => {
    if (!isQuizActive || isPreviewMode) {
        if (timerIdRef.current) clearInterval(timerIdRef.current);
        timerIdRef.current = null;
        setTimeLeft(null); 
        return; 
    }

    if (questions && questions.length > 0 && currentQuestionIndex < questions.length) {
        const currentQ = questions[currentQuestionIndex];
        setShuffledOptions(Array.isArray(currentQ.opciones_mostradas) ? currentQ.opciones_mostradas : []); 
        
        let timeForThisQuestion = null; 
        if (currentQ && currentQ.hasOwnProperty('time_per_question_seconds')) {
            const parsedTime = parseInt(currentQ.time_per_question_seconds, 10);
            if (!isNaN(parsedTime) && parsedTime > 0) { 
                timeForThisQuestion = parsedTime;
            }
        }
        
        if (timerIdRef.current) clearInterval(timerIdRef.current); // Clear any existing timer before starting a new one
        timerIdRef.current = null; 

        if (timeForThisQuestion !== null) { 
            setTimeLeft(timeForThisQuestion);
            const newTimerId = setInterval(() => { // Assign to a new const first
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        // Check if this specific timer (newTimerId) is still the active one
                        // This helps prevent a stale timer's callback from acting
                        if (timerIdRef.current === newTimerId) { 
                            clearInterval(newTimerId); // Clear this specific timer
                            timerIdRef.current = null; // Mark that no timer is active from this path

                            const questionIdForTimeout = currentQuestionIdRef.current;
                            if (questionIdForTimeout && selectedAnswersRef.current[questionIdForTimeout] === undefined) { 
                               onOptionSelectRef.current(questionIdForTimeout, -1); 
                            }
                            onNextQuestionRef.current(); 
                        }
                        return 0;
                    }
                    return prevTime - 1; 
                });
            }, 1000);
            timerIdRef.current = newTimerId; // Now set the ref to the new timer ID
        } else { 
            setTimeLeft(null); 
        }
    }
    return () => { 
        if (timerIdRef.current) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }
    };
  }, [questions, currentQuestionIndex, isPreviewMode, isQuizActive]);


  useEffect(() => {
    if (lessonId && fetchQuestionsForLesson) { 
      fetchQuestionsForLesson(lessonId); 
    }
  }, [lessonId, fetchQuestionsForLesson]);

  useEffect(() => {
    if (!isQuizActive || isPreviewMode) return; 

    const preventDefaultAction = (e) => {
        e.preventDefault();
    };
    const currentQuizViewNode = quizViewRef.current;

    if (currentQuizViewNode) {
        currentQuizViewNode.addEventListener('copy', preventDefaultAction);
        currentQuizViewNode.addEventListener('paste', preventDefaultAction);
        currentQuizViewNode.addEventListener('cut', preventDefaultAction);
        currentQuizViewNode.addEventListener('contextmenu', preventDefaultAction);
    }

    return () => {
        if (currentQuizViewNode) {
            currentQuizViewNode.removeEventListener('copy', preventDefaultAction);
            currentQuizViewNode.removeEventListener('paste', preventDefaultAction);
            currentQuizViewNode.removeEventListener('cut', preventDefaultAction);
            currentQuizViewNode.removeEventListener('contextmenu', preventDefaultAction);
        }
    };
  }, [isQuizActive, isPreviewMode]);

  const handleAdvance = () => {
    if (timerIdRef.current) { 
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
    }
    const currentQuestionId = questions[currentQuestionIndex]?.id;
    if (currentQuestionId && selectedAnswers[currentQuestionId] === undefined && !isPreviewMode && timeLeft !== 0) { 
        onOptionSelect(currentQuestionId, -1); 
    }
    
    const isLastQ = currentQuestionIndex === questions.length - 1;
    if (isLastQ && !isPreviewMode) {
        onSubmitQuizExplicit(); 
    } else {
        onNextQuestion(); 
    }
  };


  if (isLoadingGlobal && questions.length === 0 && !quizError) {
      return (
        <div className="page-container quiz-view-loading" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Cargando preguntas de la lección...</p>
        </div>
      );
  }
  if (!isLoadingGlobal && questions.length === 0 && quizError) {
      return <div className="page-container quiz-view-error"><p className="error-message">{quizError}</p></div>;
  }
  if (!isLoadingGlobal && questions.length === 0 && !quizError && lessonId) { 
   return <div className="page-container quiz-view-empty"><p style={{textAlign: 'center'}}>No hay preguntas disponibles para esta lección, o la lección no existe.</p></div>;
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="page-container quiz-view-empty"><p style={{textAlign: 'center'}}>Pregunta no encontrada o fin del quiz.</p></div>;
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="page-container quiz-container" ref={quizViewRef}>
      {isPreviewMode && (
        <div className="preview-mode-banner"> 
          <strong>Modo Previsualización (Admin):</strong> Los resultados no se guardarán. El temporizador está desactivado.
        </div>
      )}
      {quizError && <p className="error-message">{quizError}</p>}
      <div className="question-card-quiz">
        <div className="question-header">
            <h3>{currentQuestionIndex + 1}) {currentQuestion.texto_pregunta}</h3>
            {timeLeft !== null && !isPreviewMode && <div className="timer">Tiempo: {timeLeft}s</div>}
        </div>
        {currentQuestion.imagen_url && (
            <div className="question-image-container"> 
                <img 
                    src={`${API_URL}/uploads/${currentQuestion.imagen_url}`} 
                    alt={`Visual para la pregunta ${currentQuestionIndex + 1}`} 
                    className="question-image" 
                />
            </div>
        )}
        <ul className="options-list-quiz">
          {Array.isArray(shuffledOptions) && shuffledOptions.map((optionText, index) => ( 
            <li key={index} className={`option-item-quiz ${selectedAnswers[currentQuestion.id] === index ? 'selected' : ''}`}>
              <label>
                <input 
                    type="radio" 
                    name={`question-${currentQuestion.id}`} 
                    value={index} 
                    checked={selectedAnswers[currentQuestion.id] === index} 
                    onChange={() => onOptionSelect(currentQuestion.id, index)}
                />
                <span dangerouslySetInnerHTML={{ __html: optionText }} />
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="quiz-navigation">
        <span className="question-counter">Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
        <button 
            onClick={handleAdvance} 
            className={`quiz-advance-button ${isLastQuestion && !isPreviewMode ? 'submit-quiz-button' : ''} ${isLastQuestion && isPreviewMode ? 'action-button' : ''}`}
        >
          {isLastQuestion ? (isPreviewMode ? 'Finalizar Previsualización' : 'Terminar y Enviar') : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

function ResultsView({ results }) { 
  const navigate = useNavigate(); 
  const handleGoToDashboard = () => {
      navigate('/student/dashboard'); 
  };
  if (!results) return <Navigate to="/student/dashboard" replace />; 

  return (
    <div className="page-container results-container">
      <h2>Resultados de la Evaluación</h2>
      <div className="results-summary">
        <p><strong>Calificación:</strong> <span className="score-highlight">{results.score}%</span></p> 
        <p>Respuestas Correctas: {results.correct_answers} de {results.total_questions}</p>
      </div>
      {results.incorrect_details && results.incorrect_details.length > 0 && (
        <div className="incorrect-answers-section">
          <h3>Detalle de Respuestas Incorrectas:</h3>
          {results.incorrect_details.map((item) => (
            <div key={item.question_id} className="incorrect-answer-card">
              <h4>{item.texto_pregunta}</h4>
              {item.imagen_url && (
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <img 
                        src={`${API_URL}/uploads/${item.imagen_url}`} 
                        alt={`Visual de la pregunta`} 
                        style={{ maxWidth: '80%', maxHeight: '250px', borderRadius: 'var(--radio-borde)', border: '1px solid var(--bordes-sutiles)' }}
                    />
                </div>
              )}
              <p><strong>Tu respuesta:</strong> <span className="user-answer" dangerouslySetInnerHTML={{ __html: item.tu_respuesta_texto }} /> </p>
              <p><strong>Respuesta Correcta:</strong> <span className="correct-answer" dangerouslySetInnerHTML={{ __html: item.respuesta_correcta_texto }} /> </p>
              {item.procedimiento && (
                <div className="procedure-section">
                  <strong>Procedimiento o Explicación:</strong>
                  {item.procedimiento.startsWith('http://') || item.procedimiento.startsWith('https://') ? (
                    <p><a href={item.procedimiento} target="_blank" rel="noopener noreferrer">{item.procedimiento}</a></p>
                  ) : (
                    <p dangerouslySetInnerHTML={{ __html: item.procedimiento }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {(!results.incorrect_details || results.incorrect_details.length === 0) && results.score === 100 && (
        <p className="congrats-message">¡Felicidades! Todas tus respuestas fueron correctas.</p>
      )}
      <button onClick={handleGoToDashboard} className="auth-button results-container-action-button"> 
        Volver a Mis Lecciones
      </button>
    </div>
  );
}

export default App;
