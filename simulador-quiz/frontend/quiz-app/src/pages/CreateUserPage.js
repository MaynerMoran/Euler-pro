// CreateUserPage.js
// Componente React para la creación de usuarios, estilizado con CSS tradicional.

import React, { useState, useEffect } from 'react';
import './CreateUserPage.css'; // Importar el archivo CSS externo

// Icono simple de candado (puedes reemplazarlo con un SVG o una librería de iconos si lo deseas)
const LockIcon = () => (
    <span className="lock-icon">🔒</span> // Simple emoji, puedes mejorarlo
);

function CreateUserPage() {
    // Estados para manejar los campos del formulario
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [edad, setEdad] = useState('');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('estudiante'); // Valor por defecto para el rol

    // Nuevo estado para la contraseña de confirmación del administrador
    const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
    const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);

    // Estado para manejar mensajes de feedback (éxito o error)
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' o 'error'

    // Estado para indicar si se está procesando el envío del formulario
    const [isLoading, setIsLoading] = useState(false);

    // Efecto para mostrar/ocultar el campo de confirmación de contraseña
    // basado en el rol seleccionado para el nuevo usuario.
    useEffect(() => {
        if (role === 'administrador') {
            setShowAdminConfirmPassword(true);
        } else {
            setShowAdminConfirmPassword(false);
            setAdminConfirmPassword(''); // Limpiar si se cambia de admin a estudiante
        }
    }, [role]);

    // Manejador para el envío del formulario
    const handleSubmit = async (event) => {
        event.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setMessage(''); // Limpiar mensajes previos
        setMessageType('');
        setIsLoading(true); // Indicar que la operación está en curso

        // Validación básica de campos
        if (!nombres.trim() || !apellidos.trim() || !correo.trim() || !password.trim() || !edad) {
            setMessage('Todos los campos son obligatorios, incluyendo la edad.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }
        if (isNaN(parseInt(edad, 10)) || parseInt(edad, 10) <= 0) {
            setMessage('La edad debe ser un número positivo.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }

        // Validación para la contraseña de confirmación del admin
        if (role === 'administrador' && !adminConfirmPassword.trim()) {
            setMessage('Debes ingresar tu contraseña actual para crear un nuevo administrador.');
            setMessageType('error');
            setIsLoading(false);
            return;
        }

        const userData = {
            nombres,
            apellidos,
            edad: parseInt(edad, 10),
            correo,
            password, // El backend espera 'password' para la clave
            role,
        };

        // Añadir la contraseña de confirmación del admin si es necesario
        if (role === 'administrador') {
            userData.admin_confirm_password = adminConfirmPassword;
        }

        try {
            // Realizar la petición POST al backend para crear el usuario
            const response = await fetch('/api/admin/create_user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // IMPORTANTE: Incluir el token de autenticación del administrador actual
                    // 'Authorization': `Bearer ${localStorage.getItem('adminAuthToken')}`,
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                // Si la respuesta es exitosa
                setMessage(data.message || 'Usuario creado exitosamente.');
                setMessageType('success');
                // Limpiar los campos del formulario tras la creación exitosa
                setNombres('');
                setApellidos('');
                setEdad('');
                setCorreo('');
                setPassword('');
                setRole('estudiante'); // Resetear rol a estudiante
                setAdminConfirmPassword(''); // Limpiar campo de confirmación
            } else {
                // Si hay un error en la respuesta
                setMessage(data.error || `Error al crear usuario (HTTP ${response.status})`);
                setMessageType('error');
            }
        } catch (error) {
            // Si hay un error en la red o al procesar la petición
            console.error('Error al crear usuario:', error);
            setMessage('No se pudo conectar al servidor. Inténtalo de nuevo más tarde.');
            setMessageType('error');
        } finally {
            setIsLoading(false); // Indicar que la operación ha finalizado
        }
    };

    // Renderizar el componente
    return (
        <div className="create-user-page-container">
            <div className="create-user-form-card">
                <h1 className="form-title">Gestión de Usuarios</h1>
                <p className="form-subtitle">Crear una nueva cuenta</p>

                <form onSubmit={handleSubmit} className="user-form">
                    {/* Fila para Nombres y Apellidos */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="nombres">Nombres</label>
                            <input type="text" id="nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} required placeholder="Ej: Ana Lucía" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="apellidos">Apellidos</label>
                            <input type="text" id="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required placeholder="Ej: Pérez Gómez" />
                        </div>
                    </div>

                    {/* Fila para Edad y Correo Electrónico */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="edad">Edad</label>
                            <input type="number" id="edad" value={edad} onChange={(e) => setEdad(e.target.value)} required min="1" placeholder="Ej: 25" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="correo">Correo Electrónico</label>
                            <input type="email" id="correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required placeholder="usuario@example.com" />
                        </div>
                    </div>

                    {/* Campo para Clave (Contraseña) */}
                    <div className="form-group">
                        <label htmlFor="password">Clave (Contraseña)</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>

                    {/* Campo para Rol del Nuevo Usuario */}
                    <div className="form-group">
                        <label htmlFor="role">Rol del Nuevo Usuario</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="estudiante">Estudiante</option>
                            <option value="administrador">Administrador</option>
                        </select>
                    </div>

                    {/* Campo condicional para la contraseña de confirmación del admin */}
                    {showAdminConfirmPassword && (
                        <div className="admin-confirm-section">
                            <label htmlFor="adminConfirmPassword" className="admin-confirm-label">
                                <LockIcon />
                                Confirmar tu Contraseña de Administrador
                            </label>
                            <input
                                type="password"
                                id="adminConfirmPassword"
                                value={adminConfirmPassword}
                                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                                required={role === 'administrador'} // Solo requerido si el rol es admin
                                placeholder="Tu contraseña actual"
                            />
                            <p className="admin-confirm-note">
                                Para crear un nuevo administrador, por favor ingresa tu contraseña actual.
                            </p>
                        </div>
                    )}

                    {/* Botón de envío del formulario */}
                    <button type="submit" className="submit-button" disabled={isLoading}>
                        {isLoading ? 'Creando usuario...' : 'Crear Usuario'}
                    </button>
                </form>

                {/* Mensaje de feedback (éxito o error) */}
                {message && (
                    <div className={`message-feedback ${messageType === 'success' ? 'success' : 'error'}`} role="alert">
                        {message}
                    </div>
                )}
            </div>
            <footer className="page-footer">
                <p>&copy; {new Date().getFullYear()} SimuladorPro. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
}

export default CreateUserPage;
